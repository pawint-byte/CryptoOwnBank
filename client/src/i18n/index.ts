import { en } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import { fr } from "./fr";
import { tr } from "./tr";
import { hi } from "./hi";
import { zh } from "./zh";
import { useLangStore, type LangCode } from "./store";

const translations: Record<LangCode, typeof en> = { en, es, pt, fr, tr, hi, zh };

export function useTranslations() {
  const lang = useLangStore((s) => s.lang);
  return translations[lang] || en;
}

export function getTranslations(lang: LangCode) {
  return translations[lang] || en;
}
