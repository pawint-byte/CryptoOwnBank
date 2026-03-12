import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { sendEmail } from "./email";
import crypto from "crypto";

const ADMIN_EMAIL = "pawint@me.com";
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
let lastAlertSentAt = 0;

function generateFingerprint(message: string, route?: string, source?: string): string {
  const raw = `${source || "server"}:${route || "unknown"}:${message.slice(0, 200)}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 64);
}

export async function captureError(options: {
  message: string;
  stack?: string;
  source?: string;
  route?: string;
  severity?: string;
  userId?: string;
  userEmail?: string;
  statusCode?: number;
  requestMethod?: string;
  userAgent?: string;
  metadata?: any;
}) {
  try {
    const fingerprint = generateFingerprint(
      options.message,
      options.route,
      options.source
    );

    const errorLog = await storage.createErrorLog({
      message: options.message,
      stack: options.stack || null,
      source: options.source || "server",
      route: options.route || null,
      severity: options.severity || "error",
      userId: options.userId || null,
      userEmail: options.userEmail || null,
      statusCode: options.statusCode || null,
      requestMethod: options.requestMethod || null,
      userAgent: options.userAgent || null,
      metadata: options.metadata || null,
      fingerprint,
      status: "open",
    });

    if (options.severity === "critical" || (options.statusCode && options.statusCode >= 500)) {
      await sendAlertEmail(options.message, options.route, options.source, options.userId, options.userEmail);
    }

    return errorLog;
  } catch (err) {
    console.error("[errorMonitor] Failed to capture error:", err);
  }
}

async function sendAlertEmail(message: string, route?: string, source?: string, userId?: string, userEmail?: string) {
  const now = Date.now();
  if (now - lastAlertSentAt < ALERT_COOLDOWN_MS) {
    return;
  }
  lastAlertSentAt = now;

  const timestamp = new Date().toISOString();
  const userInfo = userEmail
    ? `${userEmail} (ID: ${userId || "unknown"})`
    : userId
      ? `User ID: ${userId}`
      : "Anonymous / not logged in";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #dc2626;">
        <h1 style="color: #dc2626; margin: 0;">CryptoOwnBank</h1>
        <p style="color: #666; margin: 5px 0 0;">Critical Error Alert</p>
      </div>
      <div style="padding: 30px 0;">
        <h2 style="color: #333;">Production Error Detected</h2>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-weight: 600;">${message.slice(0, 500)}</p>
        </div>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Source</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${source || "server"}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Route</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 13px;">${route || "N/A"}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">User</td><td style="padding: 8px 0; text-align: right;">${userInfo}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Time</td><td style="padding: 8px 0; text-align: right;">${timestamp}</td></tr>
          </table>
        </div>
        <p style="color: #999; font-size: 13px;">Alert emails are rate-limited to 1 per 15 minutes. Check the Error Monitor dashboard for full details.</p>
      </div>
    </div>
  `;
  try {
    await sendEmail(ADMIN_EMAIL, `[CRITICAL] Error: ${message.slice(0, 80)}`, html);
  } catch (err) {
    console.error("[errorMonitor] Failed to send alert email:", err);
  }
}

export function errorCaptureMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.claims?.sub;
  const userEmail = (req as any).user?.claims?.email;

  captureError({
    message: err.message || "Unknown error",
    stack: err.stack,
    source: "server",
    route: req.originalUrl || req.path,
    severity: (err.status && err.status < 500) ? "warning" : "error",
    userId,
    userEmail,
    statusCode: err.status || err.statusCode || 500,
    requestMethod: req.method,
    userAgent: req.headers["user-agent"],
    metadata: {
      query: req.query,
      body: req.body ? Object.keys(req.body) : undefined,
    },
  });

  next(err);
}

export function setupProcessErrorHandlers() {
  process.on("unhandledRejection", (reason: any) => {
    const message = reason?.message || String(reason);
    const stack = reason?.stack;
    console.error("[unhandledRejection]", message);
    captureError({
      message: `Unhandled Promise Rejection: ${message}`,
      stack,
      source: "server",
      severity: "critical",
    });
  });

  process.on("uncaughtException", (error: Error) => {
    console.error("[uncaughtException]", error.message);
    captureError({
      message: `Uncaught Exception: ${error.message}`,
      stack: error.stack,
      source: "server",
      severity: "critical",
    });
  });
}
