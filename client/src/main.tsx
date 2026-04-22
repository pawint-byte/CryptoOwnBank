import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (gaId) {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
  gtag("js", new Date());
  gtag("config", gaId);
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.update().catch(() => {});
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });

        const promote = (worker: ServiceWorker | null) => {
          if (worker && worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage("SKIP_WAITING");
          }
        };
        if (reg.waiting) promote(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => promote(next));
        });
      })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

