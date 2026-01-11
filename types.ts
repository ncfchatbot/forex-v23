export type AssetType = 'BTCUSD' | 'XAUUSD' | 'EURUSD';

export enum MarketSession {
  ASIAN = 'ASIAN (Sideways/Scalp)',
  LONDON = 'LONDON (Volatile/Breakout)',
  NEW_YORK = 'NEW YORK (Trend/Reversal)'
}

export enum TrendStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  SIDEWAYS = 'SIDEWAYS'
}

export interface Position {
  id: string;
  asset: AssetType;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  size: number;
  sl: number;
  tp: number;
  currentPrice: number;
  pnl: number;
  isOpen: boolean;
  timestamp: number;
  trailingStepCount: number; // How many times we've stepped up
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ma7: number;
  ma25: number;
  rsi: number;
}

export interface BotLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'AI';
}

export interface MarketState {
  currentPrice: number;
  trend: TrendStatus;
  rsi: number;
  volatility: number; // 0-100
}