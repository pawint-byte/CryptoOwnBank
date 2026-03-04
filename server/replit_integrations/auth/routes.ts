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

      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          firstName,
          lastName: lastName || null,
          passwordHash: hashedPassword,
          emailVerified: false,
          emailVerifyToken: verifyToken,
          authProvider: "email",
        })
        .returning();

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
