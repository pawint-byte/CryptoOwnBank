import nodemailer from "nodemailer";
import { storage } from "../storage";

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

function createTransporter() {
  if (!isEmailConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log("[email] SMTP not configured — skipping email send");
    return false;
  }
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
    console.log(`[email] Sent: "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error("[email] Send error:", err);
    return false;
  }
}

export async function sendTestEmail(userId: string): Promise<boolean> {
  const config = await storage.getEmailConfigByUser(userId);
  if (!config) return false;
  return sendEmail(
    config.email,
    "CryptoOwnBank — Test Email",
    `<h2>Test Email</h2><p>Your email notifications are working correctly.</p><p>You'll receive alerts for: ${config.alertTypes || "all types"}</p>`
  );
}

export async function checkAndSendAlerts(
  newPrices: Record<string, any>,
  newYields: Record<string, any[]>,
  oldPrices: Record<string, any>,
  oldYields: Record<string, any[]>
): Promise<void> {
  const alerts: string[] = [];

  for (const [symbol, priceData] of Object.entries(newPrices)) {
    const change24h = priceData?.usd_24h_change;
    if (change24h && Math.abs(change24h) > 10) {
      const direction = change24h > 0 ? "up" : "down";
      const msg = `${symbol} price moved ${direction} ${Math.abs(change24h).toFixed(1)}% in 24h (now $${priceData.usd})`;
      alerts.push(msg);
      await storage.createAlertLog({ alertType: "price_swing", message: msg });
    }
  }

  for (const [symbol, newPools] of Object.entries(newYields)) {
    const oldPools = oldYields[symbol] || [];
    for (const newPool of newPools) {
      const oldPool = oldPools.find((p: any) => p.protocol === newPool.protocol && p.pool === newPool.pool);
      if (oldPool && oldPool.apy - newPool.apy > 2) {
        const msg = `${symbol} yield on ${newPool.protocol} dropped from ${oldPool.apy?.toFixed(1)}% to ${newPool.apy?.toFixed(1)}%`;
        alerts.push(msg);
        await storage.createAlertLog({ alertType: "apy_change", message: msg });
      }
      if (!oldPool && newPool.apy > 3) {
        const msg = `New yield opportunity: ${symbol} on ${newPool.protocol} at ${newPool.apy?.toFixed(1)}% APY`;
        alerts.push(msg);
        await storage.createAlertLog({ alertType: "new_opportunity", message: msg });
      }
    }
  }

  if (alerts.length > 0) {
    const configs = await storage.getAllEmailConfigs();
    for (const config of configs) {
      const html = `<h2>CryptoOwnBank Alerts</h2><ul>${alerts.map(a => `<li>${a}</li>`).join("")}</ul>`;
      await sendEmail(config.email, `CryptoOwnBank — ${alerts.length} Alert(s)`, html);
    }
  }
}

export async function sendWeeklyDigest(prices: Record<string, any>, yields: Record<string, any[]>): Promise<void> {
  const configs = await storage.getAllEmailConfigs();

  for (const config of configs) {
    if (config.lastSentAt) {
      const daysSinceLast = (Date.now() - new Date(config.lastSentAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast < 7) continue;
    }

    const priceRows = Object.entries(prices)
      .map(([sym, d]) => {
        const change = d.usd_24h_change ? `${d.usd_24h_change > 0 ? "+" : ""}${d.usd_24h_change.toFixed(1)}%` : "N/A";
        return `<tr><td>${sym}</td><td>$${d.usd?.toLocaleString()}</td><td>${change}</td></tr>`;
      })
      .join("");

    const yieldRows = Object.entries(yields)
      .flatMap(([sym, pools]) =>
        pools.slice(0, 2).map((p: any) =>
          `<tr><td>${sym}</td><td>${p.protocol}</td><td>${p.apy?.toFixed(2)}%</td><td>$${(p.tvl / 1e6).toFixed(0)}M</td></tr>`
        )
      )
      .join("");

    const html = `
      <h2>CryptoOwnBank — Weekly Digest</h2>
      <h3>Prices</h3>
      <table border="1" cellpadding="4"><tr><th>Asset</th><th>Price</th><th>24h Change</th></tr>${priceRows}</table>
      <h3>Top Yield Opportunities</h3>
      <table border="1" cellpadding="4"><tr><th>Asset</th><th>Protocol</th><th>APY</th><th>TVL</th></tr>${yieldRows}</table>
    `;

    const sent = await sendEmail(config.email, "CryptoOwnBank — Weekly Digest", html);
    if (sent) {
      await storage.upsertEmailConfig(config.userId, { email: config.email, lastSentAt: new Date() });
    }
  }
}
