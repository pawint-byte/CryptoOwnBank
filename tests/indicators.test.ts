import { describe, it, expect } from "vitest";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  type OHLCDataPoint,
} from "../client/src/lib/indicators";

function makeData(closes: number[]): OHLCDataPoint[] {
  return closes.map((close, i) => ({
    timestamp: 1700000000000 + i * 86400000,
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
  }));
}

describe("calculateSMA", () => {
  it("calculates simple moving average correctly", () => {
    const data = makeData([10, 20, 30, 40, 50]);
    const result = calculateSMA(data, 3);
    expect(result.length).toBe(3);
    expect(result[0].value).toBeCloseTo(20, 5);
    expect(result[1].value).toBeCloseTo(30, 5);
    expect(result[2].value).toBeCloseTo(40, 5);
  });

  it("returns empty for insufficient data", () => {
    const data = makeData([10, 20]);
    expect(calculateSMA(data, 5)).toEqual([]);
  });

  it("handles period equal to data length", () => {
    const data = makeData([10, 20, 30]);
    const result = calculateSMA(data, 3);
    expect(result.length).toBe(1);
    expect(result[0].value).toBeCloseTo(20, 5);
  });

  it("period of 1 returns the closes themselves", () => {
    const data = makeData([100, 200, 300]);
    const result = calculateSMA(data, 1);
    expect(result.length).toBe(3);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(200);
    expect(result[2].value).toBe(300);
  });

  it("constant prices produce constant SMA", () => {
    const data = makeData([50, 50, 50, 50, 50]);
    const result = calculateSMA(data, 3);
    result.forEach(point => expect(point.value).toBe(50));
  });
});

describe("calculateEMA", () => {
  it("first EMA value equals SMA of first period", () => {
    const data = makeData([10, 20, 30, 40, 50]);
    const ema = calculateEMA(data, 3);
    expect(ema[0].value).toBeCloseTo(20, 5);
  });

  it("returns empty for insufficient data", () => {
    const data = makeData([10]);
    expect(calculateEMA(data, 5)).toEqual([]);
  });

  it("EMA reacts faster to price changes than SMA", () => {
    const data = makeData([10, 10, 10, 10, 10, 100]);
    const sma = calculateSMA(data, 3);
    const ema = calculateEMA(data, 3);
    const lastSma = sma[sma.length - 1].value;
    const lastEma = ema[ema.length - 1].value;
    expect(lastEma).toBeGreaterThan(lastSma);
  });

  it("constant prices produce constant EMA", () => {
    const data = makeData([25, 25, 25, 25, 25, 25]);
    const ema = calculateEMA(data, 3);
    ema.forEach(point => expect(point.value).toBeCloseTo(25, 5));
  });
});

describe("calculateRSI", () => {
  it("returns values between 0 and 100", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const data = makeData(closes);
    const result = calculateRSI(data, 14);
    result.forEach(point => {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    });
  });

  it("returns empty for insufficient data", () => {
    const data = makeData([10, 20, 30]);
    expect(calculateRSI(data, 14)).toEqual([]);
  });

  it("all gains produce RSI near 100", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 5);
    const data = makeData(closes);
    const result = calculateRSI(data, 14);
    const lastRsi = result[result.length - 1].value;
    expect(lastRsi).toBeGreaterThan(90);
  });

  it("all losses produce RSI near 0", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 200 - i * 5);
    const data = makeData(closes);
    const result = calculateRSI(data, 14);
    const lastRsi = result[result.length - 1].value;
    expect(lastRsi).toBeLessThan(10);
  });

  it("flat prices produce RSI of 50", () => {
    const data = makeData(Array(20).fill(100));
    const result = calculateRSI(data, 14);
    if (result.length > 0) {
      expect(result[0].value).toBeCloseTo(50, 0);
    }
  });
});

describe("calculateMACD", () => {
  it("returns empty for insufficient data", () => {
    const data = makeData(Array.from({ length: 20 }, (_, i) => 100 + i));
    expect(calculateMACD(data)).toEqual([]);
  });

  it("returns valid MACD points with all fields", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.3) * 20);
    const data = makeData(closes);
    const result = calculateMACD(data);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(point => {
      expect(point).toHaveProperty("macd");
      expect(point).toHaveProperty("signal");
      expect(point).toHaveProperty("histogram");
      expect(typeof point.macd).toBe("number");
      expect(typeof point.signal).toBe("number");
      expect(point.histogram).toBeCloseTo(point.macd - point.signal, 5);
    });
  });

  it("trending up produces positive MACD", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const data = makeData(closes);
    const result = calculateMACD(data);
    const last = result[result.length - 1];
    expect(last.macd).toBeGreaterThan(0);
  });
});

describe("calculateBollingerBands", () => {
  it("returns empty for insufficient data", () => {
    const data = makeData([10, 20]);
    expect(calculateBollingerBands(data)).toEqual([]);
  });

  it("upper > middle > lower always", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 10);
    const data = makeData(closes);
    const result = calculateBollingerBands(data);
    result.forEach(point => {
      expect(point.upper).toBeGreaterThan(point.middle);
      expect(point.middle).toBeGreaterThan(point.lower);
    });
  });

  it("middle band equals SMA", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const data = makeData(closes);
    const bb = calculateBollingerBands(data, 20);
    const sma = calculateSMA(data, 20);
    for (let i = 0; i < bb.length; i++) {
      expect(bb[i].middle).toBeCloseTo(sma[i].value, 5);
    }
  });

  it("flat prices produce tight bands", () => {
    const data = makeData(Array(25).fill(100));
    const result = calculateBollingerBands(data, 20);
    result.forEach(point => {
      expect(point.upper).toBeCloseTo(100, 5);
      expect(point.middle).toBeCloseTo(100, 5);
      expect(point.lower).toBeCloseTo(100, 5);
    });
  });

  it("volatile prices produce wider bands", () => {
    const flat = makeData(Array(25).fill(100));
    const volatile = makeData(Array.from({ length: 25 }, (_, i) => 100 + (i % 2 === 0 ? 20 : -20)));
    const flatBB = calculateBollingerBands(flat, 20);
    const volBB = calculateBollingerBands(volatile, 20);
    const flatWidth = flatBB[0].upper - flatBB[0].lower;
    const volWidth = volBB[0].upper - volBB[0].lower;
    expect(volWidth).toBeGreaterThan(flatWidth);
  });
});
