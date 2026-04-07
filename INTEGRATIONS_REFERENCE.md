# CryptoOwnBank — Integration Reference Guide

This document contains all the integration patterns, code snippets, and configuration details used in CryptoOwnBank. Use this as a reference when setting up similar integrations on another Replit project.

---

## Table of Contents

1. [Environment Secrets Required](#1-environment-secrets-required)
2. [Replit Integrations (Pre-installed)](#2-replit-integrations-pre-installed)
3. [Authentication (Email/Password with Passport.js)](#3-authentication-emailpassword-with-passportjs)
4. [Email via Resend](#4-email-via-resend)
5. [Stripe Payments (Subscriptions)](#5-stripe-payments-subscriptions)
6. [Crypto Payments via NOWPayments](#6-crypto-payments-via-nowpayments)
7. [Direct On-Chain Crypto Payments](#7-direct-on-chain-crypto-payments)
8. [Database Setup (PostgreSQL + Drizzle ORM)](#8-database-setup-postgresql--drizzle-orm)

---

## 1. Environment Secrets Required

```
SESSION_SECRET          — Express session encryption key
STRIPE_SECRET_KEY       — Stripe API secret key
STRIPE_WEBHOOK_SECRET   — Stripe webhook signature verification
NOWPAYMENTS_API_KEY     — NOWPayments API key (crypto payment processor)
NOWPAYMENTS_IPN_SECRET  — NOWPayments webhook signature verification
OPENAI_API_KEY          — OpenAI API key (if using AI features)
```

On Replit, set these via the Secrets tab (padlock icon). Never hardcode them.

---

## 2. Replit Integrations (Pre-installed)

These are configured through Replit's integration system (not npm packages):

- **javascript_database** — PostgreSQL database, accessed via `DATABASE_URL` env var
- **javascript_stripe** — Stripe SDK integration
- **resend** — Email delivery via Resend (API key managed by Replit connector)
- **javascript_log_in_with_replit** — Replit OAuth (optional, we use email auth instead)

To install these on a new Replit project, go to the Integrations panel and add them.

---

## 3. Authentication (Email/Password with Passport.js)

### Packages needed
```
express-session
passport
connect-pg-simple
bcrypt
```

### Session setup (server/replit_integrations/auth/replitAuth.ts)
```typescript
import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
}
```

### Auth middleware
```typescript
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (user.authProvider === "email") {
    return next();
  }
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
```

### Database schema for sessions and users
```sql
-- Sessions table (connect-pg-simple)
CREATE TABLE sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Users table
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  password_hash VARCHAR,
  username VARCHAR,
  display_name VARCHAR,
  auth_provider VARCHAR DEFAULT 'email',
  is_admin BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  email_verify_token VARCHAR,
  password_reset_token VARCHAR,
  password_reset_expires TIMESTAMP,
  security_phrase VARCHAR,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Signup flow
1. Validate email/password
2. Hash password with bcrypt
3. Generate email verification token
4. Insert user with `authProvider: "email"`
5. Send verification email
6. User clicks link to verify

### Login flow
1. Find user by email
2. Compare bcrypt hash
3. Check email is verified
4. Call `req.login()` to create session

---

## 4. Email via Resend

### How it works on Replit
Resend credentials are fetched dynamically from Replit's connector system — you don't hardcode the API key.

### Setup (server/email.ts)
```typescript
import { Resend } from "resend";

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found");
  }

  const data = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
  ).then(res => res.json());

  const conn = data.items?.[0];
  if (!conn?.settings?.api_key) throw new Error("Resend not connected");

  return {
    apiKey: conn.settings.api_key,
    fromEmail: conn.settings.from_email,
  };
}
```

### Sending emails
```typescript
const PRIMARY_FROM = "YourApp <noreply@yourdomain.com>";
const FALLBACK_FROM = "YourApp <notification@your-replit-domain.com>";

export async function sendEmail(to: string, subject: string, html: string) {
  const { apiKey, fromEmail } = await getCredentials();
  const client = new Resend(apiKey);

  // Try primary domain first, fall back to Replit-provided domain
  const fromAddresses = [
    PRIMARY_FROM,
    fromEmail ? `YourApp <${fromEmail}>` : null,
    FALLBACK_FROM,
  ].filter(Boolean);

  for (const from of fromAddresses) {
    try {
      await client.emails.send({ from, to, subject, html });
      console.log(`Email sent to ${to}: ${subject}`);
      return;
    } catch (error: any) {
      if (error?.message?.includes("not verified")) continue;
      console.error("Failed to send email:", error);
      return;
    }
  }
}
```

### Email types we send
- Welcome email (on signup)
- Email verification
- Password reset
- Deposit/withdrawal confirmations
- Price alerts
- DEX trade confirmations
- Admin notifications (feedback received)

---

## 5. Stripe Payments (Subscriptions)

### Setup (server/stripe.ts)
```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});
```

### Plan definitions
```typescript
export const PLANS = {
  monthly: {
    name: "Premium Monthly",
    amount: 2900,        // $29.00 in cents
    interval: "month",
    tier: "premium",
  },
  yearly: {
    name: "Premium Annual",
    amount: 19900,       // $199.00
    interval: "year",
    tier: "premium",
  },
  "pro-monthly": {
    name: "Pro Monthly",
    amount: 9900,        // $99.00
    interval: "month",
    tier: "pro",
  },
  "pro-yearly": {
    name: "Pro Annual",
    amount: 79900,       // $799.00
    interval: "year",
    tier: "pro",
  },
};
```

### Creating a checkout session
```typescript
export async function createCheckoutSession(userId, plan, successUrl, cancelUrl) {
  const planConfig = PLANS[plan];
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: planConfig.name, description: planConfig.description },
        unit_amount: planConfig.amount,
        recurring: { interval: planConfig.interval },
      },
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, plan, tier: planConfig.tier },
  });
  return session;
}
```

### API route to start checkout
```typescript
app.post("/api/stripe/create-checkout", isAuthenticated, async (req, res) => {
  const userId = req.user.claims.sub;
  const { plan } = req.body;

  const validPlans = ["monthly", "yearly", "pro-monthly", "pro-yearly"];
  if (!plan || !validPlans.includes(plan)) {
    return res.status(400).json({ message: "Invalid plan" });
  }

  const host = req.headers.host || "localhost:5000";
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const baseUrl = `${protocol}://${host}`;

  const session = await createCheckoutSession(
    userId, plan,
    `${baseUrl}/settings?subscription=success`,
    `${baseUrl}/settings?subscription=cancelled`
  );
  res.json({ url: session.url });
});
```

### Webhook handler
```typescript
app.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify signature
  const event = stripe.webhooks.constructEvent(
    JSON.stringify(req.body), sig, webhookSecret
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan || "monthly";
    const tier = session.metadata?.tier || "premium";
    const billingCycle = plan.includes("yearly") ? "yearly" : "monthly";

    // Update user's subscription in the database
    await storage.upsertUserSettings({
      userId,
      subscriptionTier: tier,
      subscriptionBillingCycle: billingCycle,
      subscriptionPaymentMethod: "stripe",
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
    });
  }

  if (event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    if (subscription.status === "canceled" || subscription.status === "unpaid") {
      // Revert user to free tier
      await storage.upsertUserSettings({
        userId: /* find by stripeCustomerId */,
        subscriptionTier: "free",
        subscriptionPaymentMethod: null,
      });
    }
  }

  res.json({ received: true });
});
```

### Database schema for subscriptions
```typescript
// In your user_settings table:
subscriptionTier: text("subscription_tier").default("free"),       // "free", "premium", "pro"
subscriptionBillingCycle: text("subscription_billing_cycle"),      // "monthly", "yearly"
subscriptionPaymentMethod: text("subscription_payment_method"),   // "stripe", "crypto"
subscriptionExpiresAt: timestamp("subscription_expires_at"),
stripeCustomerId: text("stripe_customer_id"),
stripeSubscriptionId: text("stripe_subscription_id"),
```

### Stripe webhook URL to configure in Stripe Dashboard
```
https://yourdomain.com/api/stripe/webhook
```
Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

---

## 6. Crypto Payments via NOWPayments

### How it works
NOWPayments is a crypto payment processor. Users select a plan + crypto chain, we generate a payment address and amount, and NOWPayments sends a webhook (IPN) when payment is confirmed.

### IPN Webhook handler
```typescript
import crypto from "crypto";

function sortObjectKeys(obj: any): any {
  return Object.keys(obj).sort().reduce((sorted: any, key) => {
    sorted[key] = obj[key]; return sorted;
  }, {});
}

app.post("/api/nowpayments/ipn", async (req, res) => {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) return res.status(500).json({ message: "IPN not configured" });

  const signature = req.headers["x-nowpayments-sig"];
  if (!signature) return res.status(400).json({ message: "Missing signature" });

  // Verify HMAC-SHA512 signature (keys must be sorted alphabetically)
  const sortedBody = JSON.stringify(sortObjectKeys(req.body));
  const hmac = crypto.createHmac("sha512", ipnSecret).update(sortedBody).digest("hex");
  if (hmac !== signature) return res.status(401).json({ message: "Invalid signature" });

  const { payment_status, order_id, pay_amount, pay_currency, actually_paid, payment_id } = req.body;

  if (payment_status === "finished" || payment_status === "confirmed") {
    const payment = await storage.getCryptoPayment(order_id);
    if (payment && payment.status === "pending") {
      await storage.updateCryptoPaymentStatus(payment.id, "confirmed", `nowpayments:${payment_id}`);
      await activateSubscription(payment);
    }
  } else if (payment_status === "expired" || payment_status === "failed") {
    const payment = await storage.getCryptoPayment(order_id);
    if (payment?.status === "pending") {
      await storage.updateCryptoPaymentStatus(payment.id, "expired");
    }
  }

  res.status(200).json({ ok: true });
});
```

### NOWPayments webhook URL to configure in their dashboard
```
https://yourdomain.com/api/nowpayments/ipn
```

---

## 7. Direct On-Chain Crypto Payments

### How it works
We also support direct crypto payments without NOWPayments. The flow:
1. User selects plan + chain
2. We fetch current crypto price from CoinGecko
3. Calculate exact amount (with unique suffix for deduplication)
4. Show our wallet address + exact amount to the user
5. User sends payment from their wallet
6. A background verifier polls blockchain explorers to confirm

### Payment creation endpoint
```typescript
app.post("/api/crypto-payment/create", isAuthenticated, async (req, res) => {
  const { plan, chain } = req.body;
  
  // Validate plan and chain...
  
  // Fetch current price from CoinGecko
  const priceRes = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
  );
  const price = priceData[coingeckoId]?.usd;

  // Calculate crypto amount with unique suffix
  let cryptoAmount = usdAmount / price;
  const uniqueSuffix = Math.floor(Math.random() * 900 + 100) / 1e8;
  cryptoAmount += uniqueSuffix;

  // For XRP/RLUSD, generate a random destination tag
  let destinationTag = null;
  if (chain === "xrp" || chain === "rlusd") {
    destinationTag = Math.floor(Math.random() * 2_000_000_000) + 1;
  }

  // Create payment record with 30-minute expiration
  const payment = await storage.createCryptoPayment({
    userId, plan, chain,
    toAddress: paymentAddr.address,
    expectedAmount: cryptoAmount.toFixed(8),
    expectedAsset: assetSymbol,
    usdAmount: usdAmount.toFixed(2),
    destinationTag,
    status: "pending",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  res.json({ ...paymentDetails });
});
```

### Supported chains for direct payment
XRP, RLUSD, Bitcoin, Ethereum, Solana, Dogecoin, Litecoin, Cardano, Avalanche, Algorand, Cosmos, Tron, Hedera, Polkadot, VeChain, Stellar, TON, Polygon, Cronos, XDC, DigiByte, Casper, Nervos, Zilliqa, Verge

### 10% crypto discount
Crypto payment amounts use discounted USD prices (e.g., $29 plan = $26.10 crypto price), giving ~10% savings as an incentive.

---

## 8. Database Setup (PostgreSQL + Drizzle ORM)

### Drizzle config (drizzle.config.ts)
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Push schema changes
```bash
npm run db:push
```

### Key patterns
- Define schemas in `shared/schema.ts`
- Use `createInsertSchema` from `drizzle-zod` for validation
- Storage interface in `server/storage.ts` wraps all DB operations
- Routes call storage methods, never query DB directly

---

## Quick Start Checklist for a New Project

1. Add Replit integrations: `javascript_database`, `javascript_stripe`, `resend`
2. Set secrets: `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. If using crypto payments: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`
4. Copy the auth setup (Passport.js + connect-pg-simple)
5. Copy the email setup (Resend connector pattern)
6. Copy the Stripe checkout + webhook handler
7. Copy the NOWPayments IPN handler if needed
8. Set webhook URLs in Stripe Dashboard and NOWPayments Dashboard
9. Push database schema with `npm run db:push`
