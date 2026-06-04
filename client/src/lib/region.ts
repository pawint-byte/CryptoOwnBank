const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", IE: "EUR", AU: "AUD", NZ: "NZD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", PT: "EUR", AT: "EUR",
  BE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR",
  LV: "EUR", LT: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF",
  RO: "RON", BG: "BGN",
  JP: "JPY", KR: "KRW", SG: "SGD", HK: "HKD", IN: "INR", ID: "IDR", PH: "PHP",
  TH: "THB", MY: "MYR", VN: "VND",
  AE: "AED", SA: "SAR", IL: "ILS", TR: "TRY", ZA: "ZAR", NG: "NGN", KE: "KES",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
};

const SEPA_COUNTRIES = new Set([
  "DE", "FR", "IT", "ES", "NL", "IE", "PT", "AT", "BE", "FI", "GR", "LU", "SK",
  "SI", "EE", "LV", "LT", "CY", "MT", "HR", "CH", "SE", "NO", "DK", "PL", "CZ", "HU", "RO", "BG",
]);

const UPI_COUNTRIES = new Set(["IN"]);

const COUNTRY_CODES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "IT", "ES", "NL", "PT", "AT",
  "BE", "FI", "CH", "SE", "NO", "DK", "PL", "CZ", "JP", "KR", "SG", "HK", "IN",
  "ID", "PH", "TH", "MY", "VN", "AE", "SA", "IL", "TR", "ZA", "NG", "KE", "BR",
  "MX", "AR", "CL", "CO", "PE",
];

const GLOBAL = "GLOBAL";

let regionDisplay: Intl.DisplayNames | undefined;
function nameOf(code: string): string {
  if (code === GLOBAL) return "Not listed / Global";
  try {
    if (!regionDisplay) regionDisplay = new Intl.DisplayNames(["en"], { type: "region" });
    return regionDisplay.of(code) || code;
  } catch {
    return code;
  }
}

export interface CountryOption {
  code: string;
  name: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: GLOBAL, name: nameOf(GLOBAL) },
  ...COUNTRY_CODES.map((c) => ({ code: c, name: nameOf(c) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  ),
];

export const GLOBAL_CODE = GLOBAL;

export function getCountryName(code: string | null | undefined): string {
  if (!code || code === GLOBAL) return "your location";
  return nameOf(code);
}

export function getFiatCurrency(code: string | null | undefined): string | undefined {
  if (!code || code === GLOBAL) return undefined;
  return COUNTRY_TO_CURRENCY[code];
}

// Best-effort country detection from the browser locale. Uses the device's
// language region subtag (e.g. en-US -> US), which reflects the user's real
// settings and is NOT changed by a VPN exit node — unlike IP geolocation.
export function detectCountry(): string | null {
  try {
    const langs =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language];
    for (const l of langs) {
      if (!l) continue;
      let region: string | undefined;
      try {
        region = (new Intl.Locale(l) as any).region;
      } catch {
        region = undefined;
      }
      if (!region) {
        const parts = l.split("-");
        region = parts.length > 1 ? parts[parts.length - 1] : undefined;
      }
      if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();
    }
  } catch {
    /* ignore */
  }
  return null;
}

export interface RegionGuidance {
  fiatCurrency?: string;
  paymentHint?: string;
}

export function getRegionGuidance(code: string | null | undefined): RegionGuidance {
  const fiatCurrency = getFiatCurrency(code);
  let paymentHint: string | undefined;
  if (code && SEPA_COUNTRIES.has(code)) {
    paymentHint =
      "In your region, a SEPA bank transfer is usually the cheapest way to pay (a card is instant but costs more).";
  } else if (code && UPI_COUNTRIES.has(code)) {
    paymentHint = "In India, paying by UPI is usually the cheapest and fastest option.";
  } else if (code === "US") {
    paymentHint =
      "A card is instant; a bank transfer (ACH) is cheaper but slower. If a provider says \u201Cnot supported in your region,\u201D turn off any VPN and try the other provider \u2014 they cover different states.";
  }
  return { fiatCurrency, paymentHint };
}
