import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated, isAdmin } from "./replitAuth";
import { users } from "@shared/models/auth";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  validateEmail,
  validatePassword,
} from "../../services/email-auth";
import {
  sendEmailVerification,
  sendPasswordReset,
  sendAccountActivatedEmail,
} from "../../email";

const ADMIN_EMAILS = ["pawint@me.com", "andrew.wint@gmail.com"];

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { passwordHash, emailVerifyToken, passwordResetToken, passwordResetExpires, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "Email, password, and first name are required" });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ message: passwordCheck.message });
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const verifyToken = generateToken();

      const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());

      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          firstName,
          lastName: lastName || null,
          passwordHash: hashedPassword,
          emailVerified: isAdminEmail ? true : false,
          emailVerifyToken: isAdminEmail ? null : verifyToken,
          authProvider: "email",
          isAdmin: isAdminEmail,
        })
        .returning();

      if (isAdminEmail) {
        const user = { claims: { sub: newUser.id }, authProvider: "email" };
        return (req as any).login(user, (err: any) => {
          if (err) {
            return res.status(201).json({
              message: "Admin account created. You can log in now.",
              requiresVerification: false,
            });
          }
          res.status(201).json({
            message: "Admin account created and logged in.",
            requiresVerification: false,
          });
        });
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const appUrl = `${protocol}://${req.hostname}`;
      const verifyUrl = `${appUrl}/verify-email/${verifyToken}`;

      try {
        await sendEmailVerification(email, firstName, verifyUrl);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }

      res.status(201).json({
        message: "Account created! Please check your email to verify your address before logging in.",
        requiresVerification: true,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const [dbUser] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!dbUser) {
        return res.status(401).json({
          message: "No account found with that email. Would you like to sign up?",
          code: "NO_ACCOUNT",
        });
      }

      if (dbUser.authProvider !== "email" || !dbUser.passwordHash) {
        return res.status(401).json({
          message: "This account uses a different login method.",
        });
      }

      const valid = await verifyPassword(password, dbUser.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!dbUser.emailVerified) {
        return res.status(403).json({
          message: "Please verify your email before logging in. Check your inbox for the verification link.",
          code: "EMAIL_NOT_VERIFIED",
        });
      }

      if (ADMIN_EMAILS.includes(dbUser.email?.toLowerCase() || "") && !dbUser.isAdmin) {
        await db.update(users).set({ isAdmin: true, updatedAt: new Date() }).where(eq(users.id, dbUser.id));
      }

      const user = { claims: { sub: dbUser.id }, authProvider: "email" };
      req.login(user, (err: any) => {
        if (err) {
          console.error("Login failed:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ message: "Logged in successfully" });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [result] = await db
        .update(users)
        .set({ emailVerified: true, emailVerifyToken: null, updatedAt: new Date() })
        .where(eq(users.emailVerifyToken, token))
        .returning({ id: users.id });

      if (!result) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [dbUser] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!dbUser || dbUser.authProvider !== "email") {
        return res.json({ message: "If an account exists with that email, a reset link has been sent." });
      }

      const resetToken = generateToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await db
        .update(users)
        .set({ passwordResetToken: resetToken, passwordResetExpires: expires, updatedAt: new Date() })
        .where(eq(users.id, dbUser.id));

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const appUrl = `${protocol}://${req.hostname}`;
      const resetUrl = `${appUrl}/reset-password/${resetToken}`;

      try {
        await sendPasswordReset(dbUser.email!, dbUser.firstName || "there", resetUrl);
      } catch (emailErr) {
        console.error("Failed to send reset email:", emailErr);
      }

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ message: passwordCheck.message });
      }

      const [dbUser] = await db
        .select({ id: users.id, passwordResetExpires: users.passwordResetExpires })
        .from(users)
        .where(eq(users.passwordResetToken, token));

      if (!dbUser) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      if (dbUser.passwordResetExpires && new Date() > dbUser.passwordResetExpires) {
        await db
          .update(users)
          .set({ passwordResetToken: null, passwordResetExpires: null })
          .where(eq(users.id, dbUser.id));
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const hashedPassword = await hashPassword(password);
      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id));

      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/admin/status", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const user = await authStorage.getUser(userId);
    res.json({ isAdmin: user?.isAdmin || false });
  });

  app.get("/api/admin/metrics", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
          isAdmin: users.isAdmin,
          emailVerified: users.emailVerified,
          authProvider: users.authProvider,
        })
        .from(users);

      const { userSettings } = await import("@shared/schema");
      const allSettings = await db.select().from(userSettings);
      const settingsMap = new Map(allSettings.map(s => [s.userId, s]));

      const totalUsers = allUsers.length;
      const verifiedUsers = allUsers.filter(u => u.emailVerified).length;
      const unverifiedUsers = totalUsers - verifiedUsers;
      const adminUsers = allUsers.filter(u => u.isAdmin).length;

      const emailAuthCount = allUsers.filter(u => u.authProvider === "email").length;
      const legacyAuthCount = allUsers.filter(u => u.authProvider !== "email").length;

      let premiumCount = 0;
      let freeCount = 0;
      for (const s of allSettings) {
        if (s.subscriptionTier === "premium") premiumCount++;
        else freeCount++;
      }
      const noSettingsCount = totalUsers - allSettings.length;
      freeCount += noSettingsCount;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const signupsToday = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= todayStart).length;
      const signups7d = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= sevenDaysAgo).length;
      const signups30d = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo).length;

      const signupsByDay: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        signupsByDay[key] = 0;
      }
      for (const u of allUsers) {
        if (u.createdAt) {
          const key = new Date(u.createdAt).toISOString().split("T")[0];
          if (signupsByDay[key] !== undefined) {
            signupsByDay[key]++;
          }
        }
      }
      const signupTrend = Object.entries(signupsByDay).map(([date, count]) => ({
        date,
        count,
      }));

      const userList = allUsers
        .sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db2 - da;
        })
        .map(u => {
          const settings = settingsMap.get(u.id);
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            createdAt: u.createdAt,
            isAdmin: u.isAdmin,
            emailVerified: u.emailVerified,
            authProvider: u.authProvider,
            subscriptionTier: settings?.subscriptionTier || "free",
            stripeCustomerId: settings?.stripeCustomerId || null,
          };
        });

      let revenue = {
        mrr: 0,
        arr: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
        monthlySubscribers: 0,
        yearlySubscribers: 0,
        recentCharges: [] as { amount: number; email: string | null; date: string; status: string; description: string | null; source: string; currency: string; customer: string | null; receiptUrl: string | null }[],
      };

      try {
        const { stripe } = await import("../../stripe");
        if (process.env.STRIPE_SECRET_KEY) {
          const subscriptions = await stripe.subscriptions.list({ status: "active", limit: 100 });
          revenue.activeSubscriptions = subscriptions.data.length;
          for (const sub of subscriptions.data) {
            const amount = sub.items.data[0]?.price?.unit_amount || 0;
            const interval = sub.items.data[0]?.price?.recurring?.interval;
            if (interval === "month") {
              revenue.monthlySubscribers++;
              revenue.mrr += amount;
            } else if (interval === "year") {
              revenue.yearlySubscribers++;
              revenue.mrr += Math.round(amount / 12);
            }
          }
          revenue.arr = revenue.mrr * 12;

          const charges = await stripe.charges.list({ limit: 50, expand: ["data.invoice"] });
          revenue.totalRevenue = 0;
          revenue.recentCharges = charges.data.map(c => {
            if (c.status === "succeeded") revenue.totalRevenue += c.amount;

            let source = "Other";
            const desc = c.description || "";
            const invoiceObj = c.invoice as any;
            const productDesc = invoiceObj?.lines?.data?.[0]?.description || "";
            const metadata = c.metadata || {};

            if (desc.toLowerCase().includes("cryptoownbank") || desc.toLowerCase().includes("crypto") ||
                productDesc.toLowerCase().includes("cryptoownbank") || productDesc.toLowerCase().includes("premium") ||
                metadata.app === "cryptoownbank" || metadata.source === "cryptoownbank") {
              source = "CryptoOwnBank";
            } else if (invoiceObj?.subscription) {
              const subDesc = productDesc || desc;
              if (subDesc) {
                source = subDesc.length > 30 ? subDesc.slice(0, 30) + "..." : subDesc;
              } else {
                source = "Subscription";
              }
            } else if (desc) {
              source = desc.length > 40 ? desc.slice(0, 40) + "..." : desc;
            }

            return {
              amount: c.amount,
              email: c.billing_details?.email || c.receipt_email || null,
              date: new Date(c.created * 1000).toISOString(),
              status: c.status || "unknown",
              description: c.description || productDesc || null,
              source,
              currency: c.currency || "usd",
              customer: typeof c.customer === "string" ? c.customer : null,
              receiptUrl: c.receipt_url || null,
            };
          });
        }
      } catch (stripeErr) {
        console.error("Stripe metrics fetch error:", stripeErr);
      }

      res.json({
        overview: {
          totalUsers,
          verifiedUsers,
          unverifiedUsers,
          adminUsers,
          premiumCount,
          freeCount,
          signupsToday,
          signups7d,
          signups30d,
        },
        authBreakdown: {
          email: emailAuthCount,
          legacy: legacyAuthCount,
        },
        revenue,
        signupTrend,
        users: userList,
      });
    } catch (error) {
      console.error("Admin metrics error:", error);
      res.status(500).json({ message: "Failed to load admin metrics" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const search = ((req.query.search as string) || "").trim().toLowerCase();

      let query = db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
          isAdmin: users.isAdmin,
          emailVerified: users.emailVerified,
          authProvider: users.authProvider,
        })
        .from(users);

      let results;
      if (search) {
        results = await query.where(
          sql`LOWER(${users.firstName}) LIKE ${"%" + search + "%"} OR LOWER(${users.lastName}) LIKE ${"%" + search + "%"} OR LOWER(${users.email}) LIKE ${"%" + search + "%"}`
        );
      } else {
        results = await query;
      }

      results.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      res.json(results);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/bulk-verify", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = await db
        .update(users)
        .set({ emailVerified: true, emailVerifyToken: null, updatedAt: new Date() })
        .where(eq(users.emailVerified, false))
        .returning({ id: users.id, email: users.email });

      console.log(`[admin] Bulk verified ${result.length} users`);
      res.json({ verified: result.length, users: result });
    } catch (error) {
      console.error("Error bulk verifying users:", error);
      res.status(500).json({ message: "Failed to bulk verify users" });
    }
  });

  app.post("/api/admin/send-activation-emails", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName })
        .from(users)
        .where(eq(users.emailVerified, true));

      const nonAdminUsers = allUsers.filter(
        (u) => u.email && !ADMIN_EMAILS.includes(u.email.toLowerCase())
      );

      let sent = 0;
      let failed = 0;
      for (const user of nonAdminUsers) {
        try {
          await sendAccountActivatedEmail(user.email!, user.firstName || "there");
          sent++;
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          console.error(`Failed to send activation email to ${user.email}:`, err);
          failed++;
        }
      }

      console.log(`[admin] Sent ${sent} activation emails, ${failed} failed`);
      res.json({ sent, failed, total: nonAdminUsers.length });
    } catch (error) {
      console.error("Error sending activation emails:", error);
      res.status(500).json({ message: "Failed to send activation emails" });
    }
  });

  app.post("/api/admin/migrate-auth", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (dbUser.authProvider === "email") {
        return res.status(400).json({ message: "User is already using email authentication" });
      }

      if (!dbUser.email) {
        return res.status(400).json({ message: "User has no email address on file" });
      }

      const resetToken = generateToken();
      const expires = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const appUrl = `${protocol}://${req.hostname}`;
      const resetUrl = `${appUrl}/reset-password/${resetToken}`;

      try {
        await sendPasswordReset(dbUser.email, dbUser.firstName || "there", resetUrl);
      } catch (emailErr) {
        console.error("Failed to send migration email:", emailErr);
        return res.status(500).json({ message: "Failed to send password reset email. Migration aborted." });
      }

      await db
        .update(users)
        .set({
          authProvider: "email",
          emailVerified: true,
          passwordResetToken: resetToken,
          passwordResetExpires: expires,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      res.json({ message: `Migrated ${dbUser.email} to email auth. A password reset link has been sent.` });
    } catch (error) {
      console.error("Auth migration error:", error);
      res.status(500).json({ message: "Failed to migrate user" });
    }
  });
}
