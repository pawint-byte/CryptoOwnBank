export interface DetectedProduct {
  productType: "cd" | "savings" | "money_market" | "checking" | "bond" | "brokerage" | "other";
  institutionName: string | null;
  balance: number | null;
  interestRate: number | null;
  apy: number | null;
  maturityDate: string | null;
  term: string | null;
  isLocked: boolean;
  rawDescription: string;
  confidence: number;
}

const INSTITUTION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bchase\b/i, name: "Chase" },
  { pattern: /\bbank of america\b/i, name: "Bank of America" },
  { pattern: /\bwells fargo\b/i, name: "Wells Fargo" },
  { pattern: /\bcitibank\b|\bciti\b/i, name: "Citibank" },
  { pattern: /\bcapital one\b/i, name: "Capital One" },
  { pattern: /\bally\b/i, name: "Ally" },
  { pattern: /\bmarcus\b|\bgoldman sachs\b/i, name: "Marcus by Goldman Sachs" },
  { pattern: /\bdiscover\b/i, name: "Discover" },
  { pattern: /\bamerican express\b|\bamex\b/i, name: "American Express" },
  { pattern: /\bschwab\b/i, name: "Charles Schwab" },
  { pattern: /\bfidelity\b/i, name: "Fidelity" },
  { pattern: /\bvanguard\b/i, name: "Vanguard" },
  { pattern: /\btd bank\b/i, name: "TD Bank" },
  { pattern: /\bpnc\b/i, name: "PNC" },
  { pattern: /\bus bank\b|u\.s\. bank/i, name: "US Bank" },
  { pattern: /\bhsbc\b/i, name: "HSBC" },
  { pattern: /\bbarclays\b/i, name: "Barclays" },
  { pattern: /\bsynchrony\b/i, name: "Synchrony" },
  { pattern: /\be[\s-]?trade\b/i, name: "E*TRADE" },
  { pattern: /\bsofi\b/i, name: "SoFi" },
  { pattern: /\brobinhood\b/i, name: "Robinhood" },
  { pattern: /\bwealthfront\b/i, name: "Wealthfront" },
  { pattern: /\bbetterment\b/i, name: "Betterment" },
  { pattern: /\bnavy federal\b/i, name: "Navy Federal Credit Union" },
  { pattern: /\bkinecta\b/i, name: "Kinecta Federal Credit Union" },
  { pattern: /\bpen ?fed\b/i, name: "PenFed Credit Union" },
  { pattern: /\bUSAA\b/i, name: "USAA" },
  { pattern: /\bmorgan stanley\b/i, name: "Morgan Stanley" },
  { pattern: /\bmerrill\b/i, name: "Merrill Lynch" },
  { pattern: /\bstash\b/i, name: "Stash" },
  { pattern: /\bacorns\b/i, name: "Acorns" },
  { pattern: /\bgreenlight\b/i, name: "Greenlight" },
  { pattern: /\bm1\s*finance\b/i, name: "M1 Finance" },
  { pattern: /\bpublic\.com\b|\bpublic\s+invest/i, name: "Public" },
  { pattern: /\bwebull\b/i, name: "Webull" },
  { pattern: /\btastyworks\b|\btastytrade\b/i, name: "Tastytrade" },
  { pattern: /\binteractive\s*brokers\b|\bIBKR\b/i, name: "Interactive Brokers" },
  { pattern: /\bcredit union\b/i, name: "Credit Union" },
];

function detectInstitution(text: string): string | null {
  const headerText = text.substring(0, Math.min(text.length, 500));
  for (const { pattern, name } of INSTITUTION_PATTERNS) {
    if (pattern.test(headerText)) return name;
  }

  const lines = text.split("\n").slice(0, 30);
  const topText = lines.join("\n");
  let earliest: { name: string; index: number } | null = null;
  for (const { pattern, name } of INSTITUTION_PATTERNS) {
    const match = topText.match(pattern);
    if (match && match.index !== undefined) {
      if (!earliest || match.index < earliest.index) {
        earliest = { name, index: match.index };
      }
    }
  }
  if (earliest) return earliest.name;

  for (const { pattern, name } of INSTITUTION_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  return null;
}

function extractBalances(text: string): number[] {
  const contextualBalances: number[] = [];
  const allBalances: number[] = [];

  const contextPatterns = [
    /(?:ending|closing|current|available|total\s+account|beginning|opening)\s*(?:balance|value|worth)[\s:]*\$\s?([\d,]+(?:\.\d{2})?)/gi,
    /(?:total|net|gross)\s*(?:portfolio|account|assets?)\s*(?:balance|value|worth)[\s:]*\$\s?([\d,]+(?:\.\d{2})?)/gi,
    /(?:balance|value|worth)\s*(?:as of|on|ending|:)\s*[^$]*\$\s?([\d,]+(?:\.\d{2})?)/gi,
    /\$\s?([\d,]+(?:\.\d{2})?)\s*(?:ending|closing|current|available|total)\s*(?:balance|value)/gi,
    /(?:your|my)\s+(?:account|balance|total|portfolio)[\s:]*\$\s?([\d,]+(?:\.\d{2})?)/gi,
    /(?:net\s*(?:asset|worth)|portfolio\s*value|account\s*value)[\s:]*\$\s?([\d,]+(?:\.\d{2})?)/gi,
  ];

  for (const pattern of contextPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (value > 0 && value < 10_000_000 && !contextualBalances.includes(value)) {
        contextualBalances.push(value);
      }
    }
  }

  const skipContextPattern = /(?:assets\s*under\s*management|fund\s*(?:net\s*)?assets|total\s*(?:net\s*)?assets\s*of\s*(?:the\s*)?fund|(?:net|total|gross)\s*asset\s*value\s*of\s*(?:the\s*)?(?:fund|portfolio|trust)|expense\s*ratio|(?:shares|units)\s*owned|(?:price|cost)\s*per\s*share|(?:unrealized|realized)\s*(?:gain|loss)\s*\$)/i;

  const balancePattern = /\$\s?([\d,]+(?:\.\d{2})?)/g;
  let match;
  while ((match = balancePattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ""));
    if (value > 0 && value < 10_000_000) {
      const surroundingStart = Math.max(0, match.index - 100);
      const surroundingEnd = Math.min(text.length, match.index + match[0].length + 50);
      const surrounding = text.substring(surroundingStart, surroundingEnd);
      if (!skipContextPattern.test(surrounding)) {
        allBalances.push(value);
      }
    }
  }

  return contextualBalances.length > 0 ? contextualBalances : allBalances;
}

function extractRates(text: string): number[] {
  const ratePattern = /(\d+\.?\d*)\s*%\s*(?:APY|APR|annual|interest|rate|yield)/gi;
  const rates: number[] = [];
  let match;
  while ((match = ratePattern.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    if (value > 0 && value < 30) {
      rates.push(value);
    }
  }
  const simpleRatePattern = /(?:APY|APR|rate|yield|interest)\s*(?:of|:)?\s*(\d+\.?\d*)\s*%/gi;
  while ((match = simpleRatePattern.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    if (value > 0 && value < 30 && !rates.includes(value)) {
      rates.push(value);
    }
  }
  return rates;
}

function extractDates(text: string): string[] {
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
    /(\d{1,2}-\d{1,2}-\d{2,4})/g,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/gi,
  ];
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      dates.push(match[1]);
    }
  }
  return dates;
}

function extractTerm(text: string): string | null {
  const termPatterns = [
    /(\d+)\s*[-]?\s*month\s*(?:cd|term|certificate)/i,
    /(\d+)\s*[-]?\s*year\s*(?:cd|term|certificate)/i,
    /term\s*(?:of|:)?\s*(\d+)\s*months?/i,
    /term\s*(?:of|:)?\s*(\d+)\s*years?/i,
    /(\d+)\s*[-]?\s*mo(?:nth)?\s*cd/i,
  ];
  for (const pattern of termPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (/year/i.test(match[0])) {
        return `${match[1]} year${parseInt(match[1]) > 1 ? "s" : ""}`;
      }
      return `${match[1]} month${parseInt(match[1]) > 1 ? "s" : ""}`;
    }
  }
  return null;
}

function extractTableRows(text: string, institution: string | null): DetectedProduct[] {
  const lines = text.split("\n");
  const products: DetectedProduct[] = [];

  const headerPattern = /account\s*name/i;
  const hasEndingBalance = /ending\s*balance/i.test(text);
  const hasAccountTable = lines.some(l => headerPattern.test(l));
  if (!hasAccountTable || !hasEndingBalance) return [];

  const totalPattern = /^\s*total\s+account\s+balance/i;
  const maskedAcctPattern = /(?:x{3,}|[*]{3,})\d{3,}/i;
  const cdKeywords = /\bCD\b|certificate|cert\b/i;

  const rowPatterns = [
    /^(.+?)\s+((?:x{3,}|[*]{3,})\d{3,})\s+\$?\s?([\d,]+(?:\.\d{2})?)\s+\$?\s?([\d,]+(?:\.\d{2})?)\s*$/,
    /^(.+?)\s+((?:x{3,}|[*]{3,})\d{3,})\s+.*\$\s?([\d,]+(?:\.\d{2})?)\s*$/,
    /^(.+?)\s{2,}((?:x{3,}|[*]{3,})\d{3,})\s{2,}.*?\$?\s?([\d,]+\.\d{2})\s*$/,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || totalPattern.test(trimmed) || headerPattern.test(trimmed)) continue;
    if (!maskedAcctPattern.test(trimmed)) continue;

    let accountName = "";
    let endingBalance: number | null = null;

    for (const pattern of rowPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        accountName = match[1].trim();
        const lastDollarAmount = match[match.length - 1];
        endingBalance = parseFloat(lastDollarAmount.replace(/,/g, ""));
        break;
      }
    }

    if (!accountName && !endingBalance) {
      const parts = trimmed.split(maskedAcctPattern);
      if (parts.length >= 1) {
        accountName = parts[0].trim();
        const allAmounts = trimmed.match(/\$?\s?([\d,]+\.\d{2})/g);
        if (allAmounts && allAmounts.length > 0) {
          const lastAmt = allAmounts[allAmounts.length - 1];
          endingBalance = parseFloat(lastAmt.replace(/[$,\s]/g, ""));
        }
      }
    }

    if (!accountName || !endingBalance || endingBalance <= 0 || endingBalance >= 10_000_000) continue;

    const isCd = cdKeywords.test(accountName);
    products.push({
      productType: isCd ? "cd" : "savings",
      institutionName: institution,
      balance: endingBalance,
      interestRate: null,
      apy: null,
      maturityDate: null,
      term: null,
      isLocked: isCd,
      rawDescription: accountName.substring(0, 200),
      confidence: 0.95,
    });
  }

  return products;
}

function extractIRAPlanTable(text: string, institution: string | null): DetectedProduct[] {
  const products: DetectedProduct[] = [];

  const planSections = text.split(/SUMMARY\s+FOR\s+/i);
  if (planSections.length <= 1) return [];

  for (let s = 1; s < planSections.length; s++) {
    const section = planSections[s];
    const headerLine = section.split("\n")[0].trim();

    const isTraditional = /traditional\s*ira/i.test(headerLine);
    const isRoth = /roth/i.test(headerLine);
    const isStatement = /statement/i.test(headerLine);
    if (isStatement) continue;
    if (!isTraditional && !isRoth) continue;

    const planLabel = isRoth ? "Roth IRA" : "Traditional IRA";
    const lines = section.split("\n");

    const hasAccountNumber = /ACCOUNT\s*NUMBER/i.test(section);
    const hasCurrentBalance = /CURRENT\s*BALANCE/i.test(section) || /BALANCE/i.test(section);
    if (!hasAccountNumber && !hasCurrentBalance) continue;

    const totalLine = /^\s*total\b/i;
    const simpleAcctRow = /(\d{10,})\s+(?:(\d{2}\/\d{2}\/\d{2,4})|N\/A)\s+(\d*\.?\d+)\s+.*?([\d,]+\.\d{2})\s*$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || totalLine.test(trimmed)) continue;

      const m = trimmed.match(simpleAcctRow);
      if (!m) continue;

      const acctNum = m[1];
      const maturityDate: string | null = m[2] || null;
      const divRate = parseFloat(m[3]);
      const balance = parseFloat(m[4].replace(/,/g, ""));

      if (balance < 0 || balance >= 10_000_000) continue;

      const acctSuffix = acctNum.slice(-4);
      const hasMat = maturityDate && maturityDate !== "N/A";
      const rawDesc = hasMat
        ? `${planLabel} Cert ****${acctSuffix} mat ${maturityDate}`
        : `${planLabel} Shares ****${acctSuffix}`;

      products.push({
        productType: "cd",
        institutionName: institution,
        balance,
        interestRate: divRate,
        apy: divRate,
        maturityDate: hasMat ? maturityDate : null,
        term: null,
        isLocked: true,
        rawDescription: rawDesc,
        confidence: 0.95,
      });
    }
  }

  return products;
}

function extractSummaryLines(text: string, institution: string | null): DetectedProduct[] {
  const products: DetectedProduct[] = [];
  const lines = text.split("\n");

  const categoryMap: Array<{ pattern: RegExp; type: DetectedProduct["productType"]; isLocked: boolean }> = [
    { pattern: /^\s*(?:total\s*balance[:\s]*)?checking\b/i, type: "checking", isLocked: false },
    { pattern: /^\s*(?:total\s*balance[:\s]*)?savings?\b/i, type: "savings", isLocked: false },
    { pattern: /^\s*(?:total\s*balance[:\s]*)?money\s*market\b/i, type: "money_market", isLocked: false },
    { pattern: /^\s*(?:total\s*balance[:\s]*)?(?:certificate|CD|share\s*certificate)\b/i, type: "cd", isLocked: true },
    { pattern: /^\s*(?:total\s*balance[:\s]*)?(?:IRA|individual\s*retirement|traditional\s*IRA|roth\s*IRA|retirement\s*account)\b/i, type: "cd", isLocked: true },
    { pattern: /^\s*(?:total\s*balance[:\s]*)?(?:investment|brokerage)\b/i, type: "brokerage", isLocked: false },
  ];

  const balanceOnLine = /\$?\s?([\d,]+\.\d{2})/;
  const zeroBalancePattern = /\.00\s*$/;
  const seenTypes = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^\s*total\s*statement\s*balance/i.test(line)) continue;

    for (const cat of categoryMap) {
      if (!cat.pattern.test(line)) continue;

      const textWithoutBalance = line.replace(balanceOnLine, "").replace(/\$\s?/g, "").trim();
      const isSummaryLine = textWithoutBalance.length < 50 && !/account\s*#|acct\s*#|maturity|owner/i.test(textWithoutBalance);
      if (!isSummaryLine) continue;

      const key = cat.type + (cat.pattern.source.includes("IRA") || cat.pattern.source.includes("retirement") ? "-ira" : "");
      if (seenTypes.has(key)) continue;

      let balance: number | null = null;
      let isZero = false;

      if (zeroBalancePattern.test(line)) {
        const zeroMatch = line.match(/([\d,]*\.00)\s*$/);
        if (zeroMatch) {
          const val = parseFloat(zeroMatch[1].replace(/,/g, ""));
          if (val === 0) {
            isZero = true;
            balance = 0;
          }
        }
      }

      if (!isZero) {
        const match = line.match(balanceOnLine);
        if (match) {
          balance = parseFloat(match[1].replace(/,/g, ""));
        }
        if (balance === null && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.length < 30) {
            const nextMatch = nextLine.match(balanceOnLine);
            if (nextMatch) {
              balance = parseFloat(nextMatch[1].replace(/,/g, ""));
            }
          }
        }
      }

      if (balance !== null && balance >= 0 && balance < 10_000_000) {
        seenTypes.add(key);

        const label = (cat.pattern.source.includes("IRA") || cat.pattern.source.includes("retirement")) ? "IRA / Retirement" : undefined;

        products.push({
          productType: cat.type,
          institutionName: institution,
          balance,
          interestRate: null,
          apy: null,
          maturityDate: null,
          term: null,
          isLocked: cat.isLocked,
          rawDescription: label || line.substring(0, 200),
          confidence: 0.9,
        });
      }
      break;
    }
  }

  return products;
}

interface SectionResult {
  text: string;
  productType: DetectedProduct["productType"];
  confidence: number;
  isLocked: boolean;
}

function classifySections(text: string): SectionResult[] {
  const sections: SectionResult[] = [];
  const lines = text.split("\n");

  const cdPatterns = /certificate of deposit|CD\s+(?:account|summary|statement)|time deposit|\bCD\b.*(?:maturity|term|rate)|share\s*certificate|cert(?:ificate)?\s*(?:of\s*)?(?:deposit|savings)/i;
  const savingsPatterns = /savings?\s*(?:account|summary|balance|share)|high[\s-]yield\s*savings|online\s*savings|regular\s*savings|primary\s*savings|share\s*savings/i;
  const moneyMarketPatterns = /money\s*market|MMA\s+(?:account|balance)|market\s*(?:rate|savings)\s*account/i;
  const checkingPatterns = /checking\s*(?:account|summary|balance)|demand\s*deposit|free\s*checking|(?:primary|everyday)\s*checking|share\s*draft/i;
  const bondPatterns = /\bbond\b.*(?:coupon|yield|maturity)|treasury|municipal\s*bond|corporate\s*bond|fixed\s*income/i;
  const brokeragePatterns = /(?:investment|brokerage|trading)\s*account|portfolio\s*(?:summary|value|balance)|securities|holdings\s*summary|(?:stock|equity|fund)\s*(?:holdings|positions|account)|(?:account|portfolio)\s*(?:holdings|positions)|market\s*value|dividend|(?:realized|unrealized)\s*gain/i;

  let currentSection = "";
  let sectionStart = 0;

  for (let i = 0; i < lines.length; i++) {
    currentSection += lines[i] + "\n";

    if ((i - sectionStart > 5 && lines[i].trim() === "") || i === lines.length - 1) {
      if (currentSection.trim().length > 20) {
        if (cdPatterns.test(currentSection)) {
          sections.push({ text: currentSection, productType: "cd", confidence: 0.8, isLocked: true });
        } else if (savingsPatterns.test(currentSection)) {
          sections.push({ text: currentSection, productType: "savings", confidence: 0.8, isLocked: false });
        } else if (moneyMarketPatterns.test(currentSection)) {
          sections.push({ text: currentSection, productType: "money_market", confidence: 0.7, isLocked: false });
        } else if (checkingPatterns.test(currentSection)) {
          sections.push({ text: currentSection, productType: "checking", confidence: 0.7, isLocked: false });
        } else if (bondPatterns.test(currentSection)) {
          sections.push({ text: currentSection, productType: "bond", confidence: 0.7, isLocked: true });
        } else if (brokeragePatterns.test(currentSection)) {
          sections.push({ text: currentSection, productType: "brokerage", confidence: 0.6, isLocked: false });
        }
      }
      currentSection = "";
      sectionStart = i + 1;
    }
  }

  if (sections.length === 0) {
    if (cdPatterns.test(text)) {
      sections.push({ text, productType: "cd", confidence: 0.6, isLocked: true });
    }
    if (savingsPatterns.test(text)) {
      sections.push({ text, productType: "savings", confidence: 0.6, isLocked: false });
    }
    if (moneyMarketPatterns.test(text)) {
      sections.push({ text, productType: "money_market", confidence: 0.5, isLocked: false });
    }
    if (checkingPatterns.test(text)) {
      sections.push({ text, productType: "checking", confidence: 0.5, isLocked: false });
    }
    if (bondPatterns.test(text)) {
      sections.push({ text, productType: "bond", confidence: 0.5, isLocked: true });
    }
    if (brokeragePatterns.test(text)) {
      sections.push({ text, productType: "brokerage", confidence: 0.4, isLocked: false });
    }
  }

  if (sections.length === 0) {
    const hasBalances = /\$\s?[\d,]+(?:\.\d{2})/.test(text);
    const hasAccountRef = /account\s*(?:number|#|no|summary|statement|balance|ending)/i.test(text);
    if (hasBalances && hasAccountRef) {
      const looksLikeBrokerage = /(?:stock|shares|dividend|portfolio|holdings|market\s*value|positions)/i.test(text);
      sections.push({
        text,
        productType: looksLikeBrokerage ? "brokerage" : "other",
        confidence: 0.3,
        isLocked: false,
      });
    }
  }

  return sections;
}

export async function parseStatement(buffer: Buffer): Promise<DetectedProduct[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text;

  try { await parser.destroy(); } catch (_) {}

  if (!text || text.trim().length < 50) {
    return [];
  }

  const institution = detectInstitution(text);

  const tableProducts = extractTableRows(text, institution);
  if (tableProducts.length > 0) {
    return tableProducts;
  }

  const iraProducts = extractIRAPlanTable(text, institution);
  if (iraProducts.length > 0) {
    return iraProducts;
  }

  const summaryProducts = extractSummaryLines(text, institution);
  if (summaryProducts.length > 0) {
    return summaryProducts;
  }

  const sections = classifySections(text);
  const products: DetectedProduct[] = [];

  const groupedSections = new Map<string, SectionResult[]>();
  for (const section of sections) {
    const existing = groupedSections.get(section.productType) || [];
    existing.push(section);
    groupedSections.set(section.productType, existing);
  }

  const documentBalances = extractBalances(text);
  const usedBalances = new Set<number>();

  if (groupedSections.size > 0) {
    for (const [productType, typeSections] of groupedSections) {
      const combinedText = typeSections.map(s => s.text).join("\n");
      const bestConfidence = Math.max(...typeSections.map(s => s.confidence));
      const isLocked = typeSections.some(s => s.isLocked);

      const sectionBalances = extractBalances(combinedText);

      const term = productType === "cd" || productType === "bond"
        ? extractTerm(combinedText)
        : null;

      let maturityDate: string | null = null;
      if (productType === "cd" || productType === "bond") {
        const maturityMatch = combinedText.match(/matur(?:ity|es?)\s*(?:date)?[:\s]*([^\n]{5,20})/i);
        if (maturityMatch) {
          const dates = extractDates(maturityMatch[1]);
          if (dates.length > 0) maturityDate = dates[0];
        }
      }

      const rates = extractRates(combinedText);
      const mainRate = rates.length > 0 ? rates[0] : null;

      let mainBalance: number | null = null;

      const hasExplicitZero = /(?:ending|closing|current|available|total\s+account|beginning|opening)\s*(?:balance|value|worth)[\s:]*\$?\s*(?:0\.00|\.00)\b/i.test(combinedText)
        || /(?:balance|value|worth)\s*(?:as of|on|ending|:)[^$\n]*\$?\s*(?:0\.00|\.00)\b/i.test(combinedText)
        || /\$\s*0\.00\s*$/m.test(combinedText)
        || /(?:total|net)\s*(?:balance|value)[\s:]*\.00\s*$/im.test(combinedText);

      if (hasExplicitZero && sectionBalances.length === 0) {
        mainBalance = 0;
      } else if (sectionBalances.length > 0) {
        const available = sectionBalances.filter(b => !usedBalances.has(b));
        const candidates = available.length > 0 ? available : sectionBalances;
        const sorted = [...candidates].sort((a, b) => b - a);
        mainBalance = sorted[0];
      } else if (documentBalances.length > 0) {
        const available = documentBalances.filter(b => !usedBalances.has(b));
        if (available.length > 0) {
          const sorted = [...available].sort((a, b) => b - a);
          mainBalance = sorted[0];
        }
      }

      if (mainBalance !== null) {
        usedBalances.add(mainBalance);
      }

      const description = typeSections[0].text.trim().substring(0, 200);

      products.push({
        productType: productType as DetectedProduct["productType"],
        institutionName: institution,
        balance: mainBalance,
        interestRate: mainRate,
        apy: mainRate,
        maturityDate,
        term,
        isLocked,
        rawDescription: description,
        confidence: bestConfidence,
      });
    }
  } else {
    const balances = extractBalances(text);
    const rates = extractRates(text);
    if (balances.length > 0) {
      const sortedFallback = [...balances].sort((a, b) => b - a);
      const fallbackBalance = sortedFallback.length >= 3 ? sortedFallback[Math.floor(sortedFallback.length * 0.25)] : sortedFallback[0];
      products.push({
        productType: "other",
        institutionName: institution,
        balance: fallbackBalance,
        interestRate: rates.length > 0 ? rates[0] : null,
        apy: rates.length > 0 ? rates[0] : null,
        maturityDate: null,
        term: null,
        isLocked: false,
        rawDescription: text.trim().substring(0, 200),
        confidence: 0.3,
      });
    }
  }

  return products;
}
