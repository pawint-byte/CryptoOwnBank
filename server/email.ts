import { Resend } from "resend";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

let connectionSettings: any;

async function getSecurityPhraseForEmail(email: string): Promise<string | null> {
  try {
    const [user] = await db.select({ securityPhrase: users.securityPhrase }).from(users).where(eq(users.email, email));
    return user?.securityPhrase || null;
  } catch {
    return null;
  }
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function injectSecurityPhrase(html: string, phrase: string | null): string {
  if (!phrase) return html;
  const safePhrase = escapeHtml(phrase);
  const banner = `<div style="background: #1a1a2e; color: #e0e0e0; padding: 10px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; text-align: center; border: 1px solid #333;">
    <span style="color: #888;">Your security phrase:</span> <strong style="color: #00A4E4; letter-spacing: 0.5px;">${safePhrase}</strong>
  </div>`;
  const insertPoint = html.indexOf('<div style="padding:');
  if (insertPoint === -1) {
    const bodyMatch = html.indexOf('border-bottom:');
    if (bodyMatch !== -1) {
      const closingDiv = html.indexOf('</div>', bodyMatch);
      if (closingDiv !== -1) {
        const afterHeader = closingDiv + 6;
        return html.slice(0, afterHeader) + banner + html.slice(afterHeader);
      }
    }
    return banner + html;
  }
  return html.slice(0, insertPoint) + banner + html.slice(insertPoint);
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email,
  };
}

async function getResendClient() {
  const { apiKey } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: connectionSettings.settings.from_email,
  };
}

const PRIMARY_FROM = "CryptoOwnBank <noreply@cryptoownbank.com>";
const FALLBACK_FROM = "CryptoOwnBank <notification@pawint-app.com>";

export async function sendEmail(to: string, subject: string, html: string, attachments?: { filename: string; content: Buffer }[]) {
  const { client, fromEmail } = await getResendClient();
  const fromAddresses = [
    PRIMARY_FROM,
    fromEmail ? `CryptoOwnBank <${fromEmail}>` : null,
    FALLBACK_FROM,
  ].filter(Boolean) as string[];

  const securityPhrase = await getSecurityPhraseForEmail(to);
  const finalHtml = injectSecurityPhrase(html, securityPhrase);

  for (const from of fromAddresses) {
    try {
      const emailData: any = { from, to, subject, html: finalHtml };
      if (attachments && attachments.length > 0) {
        emailData.attachments = attachments;
      }
      await client.emails.send(emailData);
      console.log(`Email sent to ${to}: ${subject} (from: ${from})`);
      return;
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("not verified") || msg.includes("not found") || msg.includes("domain")) {
        console.warn(`[email] Domain not verified for ${from}, trying fallback...`);
        continue;
      }
      console.error("Failed to send email:", error);
      return;
    }
  }
  console.error(`[email] All from addresses failed for: ${to} — ${subject}`);
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Be Your Own Bank</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Welcome, ${name}!</h2>
        <p style="color: #555; line-height: 1.6;">
          Your account is ready. You can now connect your cold wallet (Xumm or Ledger),
          deposit RLUSD into yield vaults, and start earning interest — all while keeping
          full control of your keys.
        </p>
        <div style="background: #f0f9ff; border-left: 4px solid #00A4E4; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #555;">
            <strong>Remember:</strong> We never store your private keys. All transactions
            are signed client-side via your cold wallet.
          </p>
        </div>
        <a href="https://cryptoownbank.com/ownbank" style="display: inline-block; background: #00A4E4; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, "Welcome to CryptoOwnBank", html);
}

export async function sendAccountActivatedEmail(to: string, name: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Be Your Own Bank</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Your Account is Ready, ${name}!</h2>
        <p style="color: #555; line-height: 1.6;">
          Great news — your account has been verified and is ready to use. We apologize for the delay
          and appreciate your patience.
        </p>
        <p style="color: #555; line-height: 1.6;">
          You can now log in with the email and password you used when you signed up and start exploring:
        </p>
        <ul style="color: #555; line-height: 2; padding-left: 20px;">
          <li>Track your crypto portfolio across multiple chains</li>
          <li>Deposit RLUSD into yield vaults and earn up to 8% APR</li>
          <li>Send payments, swap tokens on the DEX</li>
          <li>Monitor whale wallets and real-time alerts</li>
        </ul>
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://cryptoownbank.com/login" style="display: inline-block; background: #00A4E4; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Log In Now
          </a>
        </div>
        <div style="background: #f0f9ff; border-left: 4px solid #00A4E4; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #555;">
            <strong>Your keys, your crypto.</strong> We never store your private keys. All transactions
            are signed client-side via your own wallet.
          </p>
        </div>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, "Your CryptoOwnBank Account is Ready!", html);
}

export async function sendDepositConfirmation(
  to: string,
  vaultName: string,
  amount: number,
  apr: number
) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Deposit Confirmed</h2>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Vault</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${vaultName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${amount.toLocaleString()} RLUSD</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">APR</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #22c55e;">${apr}%</td></tr>
            <tr style="border-top: 1px solid #ddd;"><td style="padding: 8px 0; color: #666;">Principal Protection</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #00A4E4;">100% Locked</td></tr>
          </table>
        </div>
        <p style="color: #555; line-height: 1.6;">
          Your principal is now locked in the vault. You can withdraw <strong>only the earned interest</strong>
          at any time via your OwnBank dashboard.
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, `Deposit Confirmed: ${amount} RLUSD → ${vaultName}`, html);
}

export async function sendDexTradeConfirmation(
  to: string,
  details: {
    dex: "XRPL" | "Stellar";
    side: "Buy" | "Sell";
    orderType: "Limit" | "Market";
    baseAsset: string;
    counterAsset: string;
    amount: string;
    price: string;
    total: string;
    walletAddress: string;
    pair: string;
    timestamp: string;
  }
) {
  const e = (s: string) => escapeHtml(s);
  const truncatedWallet = `${e(details.walletAddress.slice(0, 8))}...${e(details.walletAddress.slice(-6))}`;
  const borderColor = details.dex === "XRPL" ? "#00A4E4" : "#7B61FF";
  const sideColor = details.side === "Buy" ? "#22c55e" : "#ef4444";
  const isStellarExternal = details.dex === "Stellar";
  const actionLabel = isStellarExternal ? "Trade Opened via External Wallet" : "Order Submitted";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid ${borderColor};">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">DEX Trade Record</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: ${sideColor};">${e(details.side)} ${actionLabel} — ${e(details.dex)} DEX</h2>
        <p style="color: #555; line-height: 1.6;">
          ${isStellarExternal
            ? `You opened a ${e(details.side.toLowerCase())} trade via an external Stellar wallet. This email records the trade intent — please confirm execution in your wallet app.`
            : `Your ${e(details.orderType.toLowerCase())} ${e(details.side.toLowerCase())} order has been submitted to the ${e(details.dex)} decentralized exchange. Keep this email as a record of the transaction.`
          }
        </p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Trading Pair</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${e(details.pair)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Side</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${sideColor};">${e(details.side)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Order Type</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${e(details.orderType)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${e(details.amount)} ${e(details.baseAsset)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Price</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${e(details.price)} ${e(details.counterAsset)}</td></tr>
            <tr style="border-top: 1px solid #ddd;"><td style="padding: 8px 0; color: #666; font-weight: 600;">Total</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${e(details.total)} ${e(details.counterAsset)}</td></tr>
          </table>
        </div>
        <div style="background: #f0f9ff; border-left: 4px solid ${borderColor}; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; color: #666; font-size: 13px;">DEX</td><td style="padding: 4px 0; text-align: right; font-size: 13px; font-weight: 500;">${e(details.dex)} Native Decentralized Exchange</td></tr>
            <tr><td style="padding: 4px 0; color: #666; font-size: 13px;">Wallet</td><td style="padding: 4px 0; text-align: right; font-size: 13px; font-family: monospace;">${truncatedWallet}</td></tr>
            <tr><td style="padding: 4px 0; color: #666; font-size: 13px;">Full Address</td><td style="padding: 4px 0; text-align: right; font-size: 11px; font-family: monospace; word-break: break-all;">${e(details.walletAddress)}</td></tr>
            <tr><td style="padding: 4px 0; color: #666; font-size: 13px;">Time</td><td style="padding: 4px 0; text-align: right; font-size: 13px;">${e(details.timestamp)}</td></tr>
          </table>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          ${isStellarExternal
            ? `<strong>Note:</strong> This email records your trade intent from CryptoOwnBank. The actual trade execution depends on your external Stellar wallet (LOBSTR, StellarTerm, etc.). Please verify the trade status in your wallet app.`
            : `<strong>Important:</strong> This email confirms the order was submitted and signed by your wallet. ${details.orderType === "Limit" ? "Limit orders remain open on the order book until filled or cancelled." : "Market orders execute immediately against available liquidity."} Check the ${e(details.dex)} DEX page on CryptoOwnBank for the current status of your order.`
          }
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
        <p>You received this email because you initiated a trade on CryptoOwnBank. All transactions are signed by your wallet — we never have access to your private keys.</p>
      </div>
    </div>
  `;
  await sendEmail(to, `${details.dex} DEX: ${details.side} ${details.amount} ${details.baseAsset} @ ${details.price} ${details.counterAsset}`, html);
}

export async function sendWithdrawalConfirmation(
  to: string,
  amount: number,
  vaultName: string,
  spendingWallet: string
) {
  const truncatedWallet = `${spendingWallet.slice(0, 8)}...${spendingWallet.slice(-6)}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #22c55e;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #22c55e;">Interest Withdrawn Successfully</h2>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #22c55e;">${amount.toFixed(4)} RLUSD</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">From Vault</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${vaultName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Sent To</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 13px;">${truncatedWallet}</td></tr>
          </table>
        </div>
        <p style="color: #555; line-height: 1.6;">
          Only your earned interest was withdrawn. Your principal remains 100% locked and protected in the vault.
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, `Interest Withdrawn: ${amount.toFixed(4)} RLUSD`, html);
}

export async function sendEmailVerification(to: string, firstName: string, verifyUrl: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Be Your Own Bank</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Verify Your Email</h2>
        <p style="color: #555;">Hey ${firstName},</p>
        <p style="color: #555; line-height: 1.6;">
          Thanks for signing up! Please verify your email address by clicking the button below:
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #00A4E4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, "Verify your email - CryptoOwnBank", html);
}

export async function sendPasswordReset(to: string, firstName: string, resetUrl: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Be Your Own Bank</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p style="color: #555;">Hey ${firstName},</p>
        <p style="color: #555; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new one:
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #00A4E4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, "Reset your password - CryptoOwnBank", html);
}

export async function sendFeedbackNotification(
  senderName: string,
  senderEmail: string,
  feedbackType: string,
  message: string,
  attachments?: { filename: string; content: Buffer }[]
) {
  const adminEmail = "pawint@me.com";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">New Feedback Received</p>
      </div>
      <div style="padding: 30px 0;">
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; vertical-align: top;">From</td><td style="padding: 8px 0; font-weight: 600;">${senderName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Email</td><td style="padding: 8px 0;"><a href="mailto:${senderEmail}" style="color: #00A4E4;">${senderEmail}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Type</td><td style="padding: 8px 0; font-weight: 600;">${feedbackType}</td></tr>
            <tr style="border-top: 1px solid #ddd;"><td style="padding: 12px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 12px 0; white-space: pre-wrap;">${message}</td></tr>
          </table>
        </div>
        <p style="color: #666; font-size: 13px;">You can reply directly to <a href="mailto:${senderEmail}" style="color: #00A4E4;">${senderEmail}</a></p>
      </div>
    </div>
  `;
  const attachmentInfo = attachments && attachments.length > 0
    ? `<tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Attachments</td><td style="padding: 8px 0; font-weight: 600;">${attachments.length} file(s) attached</td></tr>`
    : "";
  const finalHtml = html.replace("</table>", `${attachmentInfo}</table>`);
  await sendEmail(adminEmail, `[CryptoOwnBank Feedback] ${feedbackType} from ${senderName}`, finalHtml, attachments);
}

export async function sendPriceAlertEmail(
  to: string,
  asset: string,
  targetPrice: string,
  currentPrice: string,
  direction: string
) {
  const directionText = direction === "above" ? "risen above" : "fallen below";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Price Alert Triggered</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Price Alert: ${asset}</h2>
        <p style="color: #555; line-height: 1.6;">
          The price of <strong>${asset}</strong> has ${directionText} your target of <strong>$${targetPrice}</strong>.
        </p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Asset</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${asset}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Target Price</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">$${targetPrice}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Current Price</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #22c55e;">$${currentPrice}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Direction</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${direction === "above" ? "Above" : "Below"}</td></tr>
          </table>
        </div>
        <p style="color: #999; font-size: 13px;">This alert has been automatically deactivated. Create a new alert from your dashboard if needed.</p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, `Price Alert: ${asset} ${directionText} $${targetPrice}`, html);
}

export async function sendPremiumWelcomeEmail(to: string, plan: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f59e0b;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #f59e0b; margin: 5px 0 0; font-weight: 600;">Premium Activated</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Welcome to Premium!</h2>
        <p style="color: #555; line-height: 1.6;">
          Your ${plan} premium subscription is now active. Here's what's unlocked:
        </p>
        <ul style="color: #555; line-height: 2;">
          <li>Auto-withdraw interest weekly</li>
          <li>Tax CSV export & year-end reports</li>
          <li>Priority new vault alerts</li>
          <li>XLS-66 lending early access (when available)</li>
        </ul>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, "Welcome to CryptoOwnBank Premium!", html);
}

export async function sendReEngagementEmail(to: string, name: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Be Your Own Bank</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Hey ${name},</h2>
        <p style="color: #555; line-height: 1.6;">
          We've been busy building — CryptoOwnBank just got a major upgrade and we wanted you to be the first to know.
        </p>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: #0369a1; font-weight: 600; margin: 0 0 12px;">What's new:</p>
          <ul style="color: #555; line-height: 2; margin: 0; padding-left: 20px;">
            <li><strong>Earn 5–8% fixed APR</strong> on RLUSD — fully non-custodial</li>
            <li><strong>Portfolio tracker</strong> — track all your crypto in one place</li>
            <li><strong>Technical analysis</strong> — charts, indicators & signals</li>
            <li><strong>RWA yield discovery</strong> — find real-world asset yields</li>
            <li><strong>Stablecoin dashboard</strong> — monitor stablecoin metrics</li>
            <li><strong>Referral rewards</strong> — earn SEED points & free Premium months</li>
          </ul>
        </div>
        <p style="color: #555; line-height: 1.6;">
          Your account is ready and waiting. Sign in to explore everything that's new.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://cryptoownbank.com/login" style="display: inline-block; background: #00A4E4; color: white; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Sign In Now
          </a>
        </div>
        <p style="color: #555; font-size: 14px; text-align: center; line-height: 1.6;">
          Not sure where to start? <a href="https://cryptoownbank.com/faq" style="color: #00A4E4; text-decoration: none; font-weight: 600;">Read our FAQ</a> to see how CryptoOwnBank can help you be your own bank.
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>You're receiving this because you signed up for CryptoOwnBank. If you no longer wish to receive emails, reply with "unsubscribe."</p>
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, "CryptoOwnBank just got a major upgrade — come check it out", html);
}

export async function sendInactivityReminderEmail(to: string, name: string, daysInactive: number) {
  const is60Day = daysInactive >= 60;
  const subject = is60Day
    ? "We miss you — your CryptoOwnBank account is waiting"
    : "It's been a while — new opportunities on CryptoOwnBank";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Be Your Own Bank</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Hey ${name},</h2>
        ${is60Day ? `
        <p style="color: #555; line-height: 1.6;">
          It's been about 2 months since you last signed in. A lot has changed — we've added new features and yield opportunities you might want to check out.
        </p>
        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400e; font-weight: 600; margin: 0 0 8px;">Don't miss out</p>
          <p style="color: #a16207; margin: 0; font-size: 14px;">
            Markets move fast. Your portfolio tracker, yield vaults, and market signals are all ready for you — just sign in to see what's new.
          </p>
        </div>
        ` : `
        <p style="color: #555; line-height: 1.6;">
          It's been about a month since you last checked in. We wanted to let you know there may be new opportunities waiting for you.
        </p>
        `}
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: #0369a1; font-weight: 600; margin: 0 0 12px;">Recently added:</p>
          <ul style="color: #555; margin: 0; padding-left: 20px; line-height: 2;">
            <li><strong>RLUSD Yield Vaults</strong> — earn 5–8% fixed APR, fully non-custodial</li>
            <li><strong>Multi-chain portfolio tracker</strong> — XRP, BTC, ETH, SOL & more in one view</li>
            <li><strong>Technical analysis</strong> — interactive charts with indicators & signals</li>
            <li><strong>RWA yield discovery</strong> — find real-world asset opportunities</li>
            <li><strong>Stablecoin dashboard</strong> — live metrics for all major stablecoins</li>
            <li><strong>Referral rewards</strong> — earn SEED points & free Premium months</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://cryptoownbank.com/login" style="display: inline-block; background: #00A4E4; color: white; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Sign In & Explore
          </a>
        </div>
        <p style="color: #555; font-size: 14px; text-align: center; line-height: 1.6;">
          Have questions? <a href="https://cryptoownbank.com/faq" style="color: #00A4E4; text-decoration: none; font-weight: 600;">Read our FAQ</a> to learn how CryptoOwnBank can help you manage your crypto like your own bank.
        </p>
        <p style="color: #888; font-size: 13px; text-align: center;">
          Your account and data are exactly where you left them.
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>You're receiving this because you signed up for CryptoOwnBank. If you no longer wish to receive emails, reply with "unsubscribe."</p>
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, subject, html);
}

export async function sendYieldNotificationEmail(to: string, name: string, yieldAmount: string, vaultName: string, walletBalance: string) {
  const reDepositUrl = `https://cryptoownbank.com/ownbank-xrpl/vaults?redeposit=${walletBalance}&vault=auto`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #00A4E4;">
        <h1 style="color: #00A4E4; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #22c55e; margin: 5px 0 0; font-weight: 600;">Yield Received!</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Hey ${name},</h2>
        <p style="color: #555; line-height: 1.6;">
          Great news! Your <strong>${vaultName}</strong> vault just paid out <strong>${yieldAmount} RLUSD</strong> in yield to your wallet.
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #166534; margin: 0 0 8px; font-weight: 600;">Auto-Compound Enabled</p>
          <p style="color: #15803d; margin: 0; font-size: 14px;">
            You have auto-compound turned on for this vault. Re-deposit your yield to maximize earnings.
          </p>
        </div>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${reDepositUrl}" style="display: inline-block; background: #00A4E4; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Re-Deposit Yield Now
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">
          Or open Xaman and re-deposit manually from your wallet.
        </p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 15px; color: #999; font-size: 12px;">
        <p>You're receiving this because auto-compound is enabled on your vault. You can disable it from the OwnBank dashboard.</p>
        <p>This is not financial advice. Not a bank. You control your keys and funds at all times.</p>
      </div>
    </div>
  `;
  await sendEmail(to, `Yield Received: ${yieldAmount} RLUSD from ${vaultName}`, html);
}
