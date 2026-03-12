export interface OHLCDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SMAPoint {
  timestamp: number;
  value: number;
}

export interface EMAPoint {
  timestamp: number;
  value: number;
}

export interface RSIPoint {
  timestamp: number;
  value: number;
}

export interface MACDPoint {
  timestamp: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerPoint {
  timestamp: number;
  upper: number;
  middle: number;
  lower: number;
}

export function calculateSMA(data: OHLCDataPoint[], period: number): SMAPoint[] {
  if (data.length < period) return [];
  const result: SMAPoint[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({ timestamp: data[i].timestamp, value: sum / period });
  }
  return result;
}

export function calculateEMA(data: OHLCDataPoint[], period: number): EMAPoint[] {
  if (data.length < period) return [];
  const multiplier = 2 / (period + 1);
  const result: EMAPoint[] = [];

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({ timestamp: data[period - 1].timestamp, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ timestamp: data[i].timestamp, value: ema });
  }
  return result;
}

export function calculateRSI(data: OHLCDataPoint[], period: number = 14): RSIPoint[] {
  if (data.length < period + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  function computeRsi(gain: number, loss: number): number {
    if (gain === 0 && loss === 0) return 50;
    if (loss === 0) return 100;
    if (gain === 0) return 0;
    return 100 - 100 / (1 + gain / loss);
  }

  const result: RSIPoint[] = [];
  result.push({ timestamp: data[period].timestamp, value: computeRsi(avgGain, avgLoss) });

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] >= 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ timestamp: data[i + 1].timestamp, value: computeRsi(avgGain, avgLoss) });
  }
  return result;
}

export function calculateMACD(
  data: OHLCDataPoint[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDPoint[] {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  if (fastEMA.length === 0 || slowEMA.length === 0) return [];

  const slowStart = slowEMA[0].timestamp;
  const alignedFast = fastEMA.filter((p) => p.timestamp >= slowStart);

  if (alignedFast.length !== slowEMA.length) {
    const minLen = Math.min(alignedFast.length, slowEMA.length);
    alignedFast.splice(0, alignedFast.length - minLen);
    slowEMA.splice(0, slowEMA.length - minLen);
  }

  const macdLine: { timestamp: number; value: number }[] = [];
  for (let i = 0; i < alignedFast.length; i++) {
    macdLine.push({
      timestamp: alignedFast[i].timestamp,
      value: alignedFast[i].value - slowEMA[i].value,
    });
  }

  if (macdLine.length < signalPeriod) return [];

  const signalMultiplier = 2 / (signalPeriod + 1);
  let signalEma = 0;
  for (let i = 0; i < signalPeriod; i++) {
    signalEma += macdLine[i].value;
  }
  signalEma /= signalPeriod;

  const result: MACDPoint[] = [];
  result.push({
    timestamp: macdLine[signalPeriod - 1].timestamp,
    macd: macdLine[signalPeriod - 1].value,
    signal: signalEma,
    histogram: macdLine[signalPeriod - 1].value - signalEma,
  });

  for (let i = signalPeriod; i < macdLine.length; i++) {
    signalEma = (macdLine[i].value - signalEma) * signalMultiplier + signalEma;
    result.push({
      timestamp: macdLine[i].timestamp,
      macd: macdLine[i].value,
      signal: signalEma,
      histogram: macdLine[i].value - signalEma,
    });
  }
  return result;
}

export function calculateBollingerBands(
  data: OHLCDataPoint[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerPoint[] {
  if (data.length < period) return [];
  const sma = calculateSMA(data, period);
  const result: BollingerPoint[] = [];

  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1;
    let sumSqDiff = 0;
    for (let j = dataIndex - period + 1; j <= dataIndex; j++) {
      sumSqDiff += (data[j].close - sma[i].value) ** 2;
    }
    const stdDev = Math.sqrt(sumSqDiff / period);
    result.push({
      timestamp: sma[i].timestamp,
      upper: sma[i].value + stdDevMultiplier * stdDev,
      middle: sma[i].value,
      lower: sma[i].value - stdDevMultiplier * stdDev,
    });
  }
  return result;
}
