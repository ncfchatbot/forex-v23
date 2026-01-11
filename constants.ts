import { AssetType } from './types';

export const INITIAL_BALANCE = 10000;

export const ASSETS: Record<AssetType, { name: string; leverage: number; spread: number; recommendedTimeframe: string }> = {
  'BTCUSD': { 
    name: 'Bitcoin', 
    leverage: 100, 
    spread: 20,
    recommendedTimeframe: 'H1' // Crypto needs higher TF to filter noise
  },
  'XAUUSD': { 
    name: 'Gold', 
    leverage: 200, 
    spread: 0.2,
    recommendedTimeframe: 'M15' // Balance between volatility and trend
  },
  'EURUSD': { 
    name: 'Euro', 
    leverage: 500, 
    spread: 0.0001,
    recommendedTimeframe: 'M5' // High liquidity allows faster scalping
  },
};

export const COLORS = {
  buy: '#10b981', // emerald-500
  sell: '#ef4444', // red-500
  neutral: '#64748b', // slate-500
  chartLine: '#3b82f6', // blue-500
  maFast: '#f59e0b', // amber-500
  maSlow: '#8b5cf6', // violet-500
};