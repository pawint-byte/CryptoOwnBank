import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { localizeAndCanonicalize } from "./seo-localize";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js') || filePath.includes('workbox-')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // fall through to index.html for all document routes, localized per ?lang=
  app.use("*", (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html');
    const html = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
    res.status(200).send(localizeAndCanonicalize(html, req));
  });
}
