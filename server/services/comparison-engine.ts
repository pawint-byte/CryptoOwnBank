export interface AlternativeProduct {
  name: string;
  type: string;
  rate: number;
  rateType: "APR" | "APY";
  lockup: string;
  minimum: string;
  custody: string;
  riskNote: string;
  isInsured: boolean;
}

export interface ComparisonInsight {
  currentProduct: {
    type: string;
    institution: string | null;
    rate: number | null;
    balance: number | null;
    isLocked: boolean;
    term: string | null;
    maturityDate: string | null;
  };
  alternative: AlternativeProduct;
  rateDifference: number | null;
  projectedAnnualDifference: number | null;
  liquidityComparison: string;
  riskComparison: string;
  disclaimerLevel: "standard" | "elevated";
}

const ALTERNATIVES: AlternativeProduct[] = [
  {
    name: "Soil Treasury Vault (RLUSD)",
    type: "defi_vault",
    rate: 5.2,
    rateType: "APR",
    lockup: "No lock-up period",
    minimum: "No minimum deposit",
    custody: "Self-custody (non-custodial)",
    riskNote: "Smart contract risk. Not FDIC insured. RLUSD is an institutional-grade stablecoin issued by Ripple, but carries issuer risk.",
    isInsured: false,
  },
  {
    name: "Soil Credit+ Vault (RLUSD)",
    type: "defi_vault",
    rate: 8.0,
    rateType: "APR",
    lockup: "No lock-up period",
    minimum: "No minimum deposit",
    custody: "Self-custody (non-custodial)",
    riskNote: "Smart contract risk. Not FDIC insured. Higher rate reflects higher risk credit exposure. RLUSD carries issuer risk.",
    isInsured: false,
  },
  {
    name: "High-Yield Savings (National Average)",
    type: "savings_benchmark",
    rate: 4.5,
    rateType: "APY",
    lockup: "No lock-up",
    minimum: "Varies by institution",
    custody: "Bank-held (custodial)",
    riskNote: "FDIC insured up to $250,000 per depositor, per institution.",
    isInsured: true,
  },
  {
    name: "US Treasury Bills (Benchmark)",
    type: "tbill_benchmark",
    rate: 4.3,
    rateType: "APY",
    lockup: "4 to 52 weeks depending on term",
    minimum: "$100 via TreasuryDirect",
    custody: "Government-held",
    riskNote: "Backed by full faith and credit of the US government. Considered risk-free for principal.",
    isInsured: true,
  },
];

const PRODUCT_LABELS: Record<string, string> = {
  cd: "Certificate of Deposit",
  savings: "Savings Account",
  money_market: "Money Market Account",
  checking: "Checking Account",
  bond: "Bond/Fixed Income",
  brokerage: "Brokerage Account",
  other: "Financial Account",
};

function getRelevantAlternatives(productType: string, currentRate: number | null): AlternativeProduct[] {
  const relevant: AlternativeProduct[] = [];

  for (const alt of ALTERNATIVES) {
    if (productType === "checking") {
      if (alt.type === "savings_benchmark" || alt.type === "defi_vault") {
        relevant.push(alt);
      }
    } else if (productType === "cd" || productType === "bond") {
      relevant.push(alt);
    } else if (productType === "savings" || productType === "money_market") {
      if (currentRate !== null && alt.rate > currentRate) {
        relevant.push(alt);
      } else if (currentRate === null) {
        relevant.push(alt);
      }
    } else {
      if (alt.type === "defi_vault") {
        relevant.push(alt);
      }
    }
  }

  return relevant;
}

export function generateComparisons(product: {
  productType: string;
  institutionName: string | null;
  balance: number | null;
  interestRate: number | null;
  apy: number | null;
  maturityDate: string | null;
  term: string | null;
  isLocked: boolean;
}): ComparisonInsight[] {
  const currentRate = product.apy ?? product.interestRate;
  const alternatives = getRelevantAlternatives(product.productType, currentRate);
  const insights: ComparisonInsight[] = [];

  for (const alt of alternatives) {
    const rateDiff = currentRate !== null ? alt.rate - currentRate : null;
    let projectedDiff: number | null = null;

    if (product.balance !== null && rateDiff !== null) {
      projectedDiff = Math.round((product.balance * rateDiff / 100) * 100) / 100;
    }

    let liquidityComparison: string;
    if (product.isLocked && product.term) {
      liquidityComparison = `Your ${PRODUCT_LABELS[product.productType] || product.productType} locks funds for ${product.term}. ${alt.lockup}.`;
    } else if (product.isLocked) {
      liquidityComparison = `Your ${PRODUCT_LABELS[product.productType] || product.productType} has restrictions on early withdrawal. ${alt.lockup}.`;
    } else {
      liquidityComparison = `Both options offer relatively flexible access to funds. ${alt.lockup}.`;
    }

    const riskComparison = alt.isInsured
      ? `Both are relatively low-risk options. ${alt.riskNote}`
      : `Bank deposits are FDIC insured up to $250,000. ${alt.riskNote}`;

    const disclaimerLevel: "standard" | "elevated" =
      (!alt.isInsured) ? "elevated" : "standard";

    insights.push({
      currentProduct: {
        type: PRODUCT_LABELS[product.productType] || product.productType,
        institution: product.institutionName,
        rate: currentRate,
        balance: product.balance,
        isLocked: product.isLocked,
        term: product.term,
        maturityDate: product.maturityDate,
      },
      alternative: alt,
      rateDifference: rateDiff,
      projectedAnnualDifference: projectedDiff,
      liquidityComparison,
      riskComparison,
      disclaimerLevel,
    });
  }

  return insights;
}
