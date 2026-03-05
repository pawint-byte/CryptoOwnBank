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

createRoot(document.getElementById("root")!).render(<App />);
