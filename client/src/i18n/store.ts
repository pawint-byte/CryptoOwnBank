import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LangCode = "en" | "es" | "pt" | "fr" | "tr" | "hi" | "zh";

export const LANGUAGES: { code: LangCode; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Espanol" },
  { code: "pt", label: "Portuguese", nativeLabel: "Portugues" },
  { code: "fr", label: "French", nativeLabel: "Francais" },
  { code: "tr", label: "Turkish", nativeLabel: "Turkce" },
  { code: "hi", label: "Hindi", nativeLabel: "\u0939\u093F\u0902\u0926\u0940" },
  { code: "zh", label: "Mandarin", nativeLabel: "\u4E2D\u6587" },
];

interface LangState {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

function detectBrowserLang(): LangCode {
  const nav = navigator.language?.toLowerCase() || "";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("tr")) return "tr";
  if (nav.startsWith("hi")) return "hi";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: detectBrowserLang(),
      setLang: (lang) => set({ lang }),
    }),
    { name: "cob-lang" }
  )
);
