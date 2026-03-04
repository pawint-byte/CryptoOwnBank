import { Resend } from "resend";

let connectionSettings: any;

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

const FROM_EMAIL = "notification@pawint-app.com";

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { client } = await getResendClient();
    await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
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
