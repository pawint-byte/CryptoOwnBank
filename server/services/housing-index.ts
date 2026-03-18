import { db } from "../db";
import { housingIndices, properties } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

const US_METRO_SERIES: Record<string, { seriesId: string; region: string }> = {
  "ATXRSA":  { seriesId: "ATXRSA",  region: "Atlanta" },
  "BOXRSA":  { seriesId: "BOXRSA",  region: "Boston" },
  "CRXRSA":  { seriesId: "CRXRSA",  region: "Charlotte" },
  "CHXRSA":  { seriesId: "CHXRSA",  region: "Chicago" },
  "LEXRSA":  { seriesId: "LEXRSA",  region: "Cleveland" },
  "DAXRSA":  { seriesId: "DAXRSA",  region: "Dallas" },
  "DNXRSA":  { seriesId: "DNXRSA",  region: "Denver" },
  "DEXRSA":  { seriesId: "DEXRSA",  region: "Detroit" },
  "LVXRSA":  { seriesId: "LVXRSA",  region: "Las Vegas" },
  "LXXRSA":  { seriesId: "LXXRSA",  region: "Los Angeles" },
  "MIXRSA":  { seriesId: "MIXRSA",  region: "Miami" },
  "MNXRSA":  { seriesId: "MNXRSA",  region: "Minneapolis" },
  "NYXRSA":  { seriesId: "NYXRSA",  region: "New York" },
  "PHXRSA":  { seriesId: "PHXRSA",  region: "Phoenix" },
  "POXRSA":  { seriesId: "POXRSA",  region: "Portland" },
  "SDXRSA":  { seriesId: "SDXRSA",  region: "San Diego" },
  "SFXRSA":  { seriesId: "SFXRSA",  region: "San Francisco" },
  "SEXRSA":  { seriesId: "SEXRSA",  region: "Seattle" },
  "TPXRSA":  { seriesId: "TPXRSA",  region: "Tampa" },
  "WDXRSA":  { seriesId: "WDXRSA",  region: "Washington DC" },
  "CSUSHPINSA": { seriesId: "CSUSHPINSA", region: "US National" },
};

const STATE_TO_METRO: Record<string, string> = {
  "GA": "ATXRSA",
  "MA": "BOXRSA",
  "IL": "CHXRSA",
  "OH": "LEXRSA",
  "TX": "DAXRSA",
  "CO": "DNXRSA",
  "MI": "DEXRSA",
  "NV": "LVXRSA",
  "MN": "MNXRSA",
  "AZ": "PHXRSA",
  "OR": "POXRSA",
  "WA": "SEXRSA",
  "DC": "WDXRSA",
};

const CITY_TO_METRO: Record<string, string> = {
  "atlanta": "ATXRSA",
  "boston": "BOXRSA",
  "charlotte": "CRXRSA",
  "chicago": "CHXRSA",
  "cleveland": "LEXRSA",
  "dallas": "DAXRSA",
  "fort worth": "DAXRSA",
  "denver": "DNXRSA",
  "detroit": "DEXRSA",
  "las vegas": "LVXRSA",
  "los angeles": "LXXRSA",
  "long beach": "LXXRSA",
  "anaheim": "LXXRSA",
  "miami": "MIXRSA",
  "fort lauderdale": "MIXRSA",
  "minneapolis": "MNXRSA",
  "saint paul": "MNXRSA",
  "new york": "NYXRSA",
  "brooklyn": "NYXRSA",
  "queens": "NYXRSA",
  "manhattan": "NYXRSA",
  "jersey city": "NYXRSA",
  "newark": "NYXRSA",
  "phoenix": "PHXRSA",
  "scottsdale": "PHXRSA",
  "portland": "POXRSA",
  "san diego": "SDXRSA",
  "san francisco": "SFXRSA",
  "oakland": "SFXRSA",
  "san jose": "SFXRSA",
  "seattle": "SEXRSA",
  "tacoma": "SEXRSA",
  "tampa": "TPXRSA",
  "st petersburg": "TPXRSA",
  "clearwater": "TPXRSA",
  "sarasota": "TPXRSA",
  "fort myers": "TPXRSA",
  "naples": "TPXRSA",
  "punta gorda": "TPXRSA",
  "cape coral": "TPXRSA",
  "port charlotte": "TPXRSA",
  "washington": "WDXRSA",
  "arlington": "WDXRSA",
  "alexandria": "WDXRSA",
  "bethesda": "WDXRSA",
  "raleigh": "CRXRSA",
  "durham": "CRXRSA",
  "cary": "CRXRSA",
};

const FL_ZIP_TO_METRO: Record<string, string> = {
  "33": "TPXRSA",
  "34": "TPXRSA",
  "32": "MIXRSA",
};

const COUNTRY_FALLBACK_RATES: Record<string, { annualRate: number; source: string }> = {
  "US": { annualRate: 0.047, source: "S&P/Case-Shiller US National (historical avg)" },
  "GB": { annualRate: 0.043, source: "UK ONS House Price Index (historical avg)" },
  "CA": { annualRate: 0.052, source: "Teranet-National Bank HPI (historical avg)" },
  "AU": { annualRate: 0.065, source: "CoreLogic Australia (historical avg)" },
  "DE": { annualRate: 0.038, source: "Eurostat Germany (historical avg)" },
  "FR": { annualRate: 0.032, source: "Eurostat France (historical avg)" },
  "NL": { annualRate: 0.045, source: "Eurostat Netherlands (historical avg)" },
  "IE": { annualRate: 0.048, source: "Eurostat Ireland (historical avg)" },
  "ES": { annualRate: 0.028, source: "Eurostat Spain (historical avg)" },
  "IT": { annualRate: 0.015, source: "Eurostat Italy (historical avg)" },
  "JP": { annualRate: 0.010, source: "Japan MLIT (historical avg)" },
  "SG": { annualRate: 0.055, source: "URA Singapore (historical avg)" },
  "HK": { annualRate: 0.058, source: "Rating & Valuation Dept HK (historical avg)" },
  "NZ": { annualRate: 0.062, source: "REINZ New Zealand (historical avg)" },
  "SE": { annualRate: 0.050, source: "Eurostat Sweden (historical avg)" },
  "NO": { annualRate: 0.048, source: "SSB Norway (historical avg)" },
  "CH": { annualRate: 0.035, source: "Swiss National Bank (historical avg)" },
  "AE": { annualRate: 0.040, source: "DLD Dubai (historical avg)" },
  "IN": { annualRate: 0.055, source: "NHB India (historical avg)" },
  "BR": { annualRate: 0.042, source: "FipeZap Brazil (historical avg)" },
  "MX": { annualRate: 0.038, source: "SHF Mexico (historical avg)" },
  "ZA": { annualRate: 0.045, source: "FNB South Africa (historical avg)" },
  "KR": { annualRate: 0.048, source: "KOSIS South Korea (historical avg)" },
};

export function resolveMetroSeries(city: string, state: string | null, zipCode: string | null, country: string): string {
  if (country !== "US") return "";

  const cityLower = city.toLowerCase().trim();
  if (CITY_TO_METRO[cityLower]) return CITY_TO_METRO[cityLower];

  if (state === "FL" && zipCode) {
    const prefix = zipCode.substring(0, 2);
    if (FL_ZIP_TO_METRO[prefix]) return FL_ZIP_TO_METRO[prefix];
    return "TPXRSA";
  }

  if (state === "CA") return "LXXRSA";
  if (state === "NY") return "NYXRSA";
  if (state === "NJ") return "NYXRSA";
  if (state === "CT") return "NYXRSA";

  if (state && STATE_TO_METRO[state]) return STATE_TO_METRO[state];

  return "CSUSHPINSA";
}

export function getMetroLabel(seriesId: string): string {
  return US_METRO_SERIES[seriesId]?.region || "US National";
}

async function fetchFredSeries(seriesId: string, apiKey: string): Promise<{ date: string; value: number }[]> {
  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=240`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      console.error(`[housing] FRED API error for ${seriesId}: ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    if (!data.observations) return [];
    return data.observations
      .filter((o: any) => o.value !== ".")
      .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }));
  } catch (err) {
    console.error(`[housing] Failed to fetch FRED series ${seriesId}:`, err);
    return [];
  }
}

export async function refreshHousingIndices(): Promise<void> {
  const fredApiKey = process.env.FRED_API_KEY;
  if (!fredApiKey) {
    console.log("[housing] No FRED_API_KEY set — using fallback appreciation rates");
    await updatePropertiesWithFallbackRates();
    return;
  }

  console.log("[housing] Refreshing housing indices from FRED...");

  const allProperties = await db.select().from(properties);
  const neededSeries = new Set<string>();
  neededSeries.add("CSUSHPINSA");
  for (const prop of allProperties) {
    if (prop.indexSeriesId) neededSeries.add(prop.indexSeriesId);
  }

  for (const seriesId of neededSeries) {
    const observations = await fetchFredSeries(seriesId, fredApiKey);
    if (observations.length === 0) continue;

    await db.delete(housingIndices).where(eq(housingIndices.seriesId, seriesId));

    const batches = [];
    for (let i = 0; i < observations.length; i += 50) {
      batches.push(observations.slice(i, i + 50));
    }
    for (const batch of batches) {
      await db.insert(housingIndices).values(
        batch.map(o => ({
          seriesId,
          country: "US",
          region: getMetroLabel(seriesId),
          date: o.date,
          value: o.value.toFixed(4),
        }))
      );
    }

    console.log(`[housing] Stored ${observations.length} observations for ${seriesId} (${getMetroLabel(seriesId)})`);
  }

  await updatePropertiesFromIndices();
}

async function updatePropertiesFromIndices(): Promise<void> {
  const allProperties = await db.select().from(properties);

  for (const prop of allProperties) {
    const seriesId = prop.indexSeriesId || "CSUSHPINSA";

    const indexData = await db
      .select()
      .from(housingIndices)
      .where(eq(housingIndices.seriesId, seriesId))
      .orderBy(desc(housingIndices.date));

    if (indexData.length < 2) {
      await updateWithFallback(prop);
      continue;
    }

    const latestValue = parseFloat(indexData[0].value);
    const purchaseDate = prop.purchaseDate;

    let purchaseIndex = indexData.find(d => d.date <= purchaseDate);
    if (!purchaseIndex) purchaseIndex = indexData[indexData.length - 1];
    const purchaseValue = parseFloat(purchaseIndex.value);

    if (purchaseValue <= 0) {
      await updateWithFallback(prop);
      continue;
    }

    const appreciationPct = ((latestValue - purchaseValue) / purchaseValue) * 100;
    const purchasePrice = parseFloat(prop.purchasePrice);
    const currentValue = purchasePrice * (1 + appreciationPct / 100);

    await db
      .update(properties)
      .set({
        currentValue: currentValue.toFixed(2),
        appreciationPct: appreciationPct.toFixed(4),
        lastUpdated: new Date(),
      })
      .where(eq(properties.id, prop.id));

    console.log(`[housing] Updated property ${prop.id}: ${prop.address} → $${currentValue.toFixed(0)} (${appreciationPct > 0 ? "+" : ""}${appreciationPct.toFixed(2)}%)`);
  }
}

async function updateWithFallback(prop: typeof properties.$inferSelect): Promise<void> {
  const country = prop.country || "US";
  const fallback = COUNTRY_FALLBACK_RATES[country] || { annualRate: 0.03, source: "Global average" };

  const purchaseDate = new Date(prop.purchaseDate);
  const now = new Date();
  const yearsHeld = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  const purchasePrice = parseFloat(prop.purchasePrice);
  const currentValue = purchasePrice * Math.pow(1 + fallback.annualRate, yearsHeld);
  const appreciationPct = ((currentValue - purchasePrice) / purchasePrice) * 100;

  await db
    .update(properties)
    .set({
      currentValue: currentValue.toFixed(2),
      appreciationPct: appreciationPct.toFixed(4),
      lastUpdated: new Date(),
    })
    .where(eq(properties.id, prop.id));
}

async function updatePropertiesWithFallbackRates(): Promise<void> {
  const allProperties = await db.select().from(properties);
  for (const prop of allProperties) {
    await updateWithFallback(prop);
  }
  if (allProperties.length > 0) {
    console.log(`[housing] Updated ${allProperties.length} properties with fallback appreciation rates`);
  }
}

export function startHousingIndexScheduler(): void {
  refreshHousingIndices().catch(err => console.error("[housing] Initial refresh failed:", err));

  setInterval(() => {
    refreshHousingIndices().catch(err => console.error("[housing] Scheduled refresh failed:", err));
  }, 24 * 60 * 60 * 1000);

  console.log("[housing] Scheduler started — refreshing daily");
}
