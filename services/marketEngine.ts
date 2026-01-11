import { Candle, AssetType, TrendStatus } from '../types';

// Simple simulated market engine using Random Walk + Momentum
let lastPrice = {
  'BTCUSD': 65000,
  'XAUUSD': 2350,
  'EURUSD': 1.0800
};

let momentum = {
  'BTCUSD': 0,
  'XAUUSD': 0,
  'EURUSD': 0
};

// RSI Calculation Helper
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const generateNextCandle = (
  asset: AssetType, 
  prevCandles: Candle[], 
  volatilityMultiplier: number,
  sessionBias: number // -1 (Bearish) to 1 (Bullish), 0 neutral
): Candle => {
  const currentLast = lastPrice[asset];
  
  // Random noise (-1 to 1)
  const noise = (Math.random() - 0.5) * 2;
  
  // Momentum persistence (trends tend to continue)
  momentum[asset] = momentum[asset] * 0.9 + noise * 0.1 + (sessionBias * 0.05);

  const volatility = asset === 'BTCUSD' ? 50 : asset === 'XAUUSD' ? 2 : 0.0005;
  const change = (momentum[asset] + noise) * volatility * volatilityMultiplier;
  
  const close = currentLast + change;
  const open = currentLast;
  const high = Math.max(open, close) + Math.random() * volatility * 0.5;
  const low = Math.min(open, close) - Math.random() * volatility * 0.5;

  lastPrice[asset] = close;

  const newCandle: Candle = {
    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
    open,
    high,
    low,
    close,
    ma7: 0, 
    ma25: 0,
    rsi: 50
  };

  // Recalculate Indicators
  const lookback = [...prevCandles, newCandle];
  const closes = lookback.map(c => c.close);
  
  // MA7
  if (closes.length >= 7) {
    newCandle.ma7 = closes.slice(-7).reduce((a, b) => a + b, 0) / 7;
  } else {
    newCandle.ma7 = close;
  }

  // MA25
  if (closes.length >= 25) {
    newCandle.ma25 = closes.slice(-25).reduce((a, b) => a + b, 0) / 25;
  } else {
    newCandle.ma25 = close;
  }

  // RSI
  newCandle.rsi = calculateRSI(closes);

  return newCandle;
};

export const analyzeTrend = (candle: Candle): TrendStatus => {
  if (candle.ma7 > candle.ma25 && candle.close > candle.ma7) return TrendStatus.UP;
  if (candle.ma7 < candle.ma25 && candle.close < candle.ma7) return TrendStatus.DOWN;
  return TrendStatus.SIDEWAYS;
};