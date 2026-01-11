import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Candle, Position, AssetType, MarketSession, TrendStatus, BotLog } from './types';
import { generateNextCandle, analyzeTrend } from './services/marketEngine';
import { getMarketAnalysis } from './services/geminiService';
import { INITIAL_BALANCE, ASSETS } from './constants';
import TradingChart from './components/TradingChart';
import ControlPanel from './components/ControlPanel';
import TradeLog from './components/TradeLog';
import ExportModal from './components/ExportModal'; // Import the new modal
import { BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [isRunning, setIsRunning] = useState(false);
  const [asset, setAsset] = useState<AssetType>('XAUUSD');
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [equity, setEquity] = useState(INITIAL_BALANCE);
  const [session, setSession] = useState<MarketSession>(MarketSession.ASIAN);
  const [trend, setTrend] = useState<TrendStatus>(TrendStatus.SIDEWAYS);
  const [data, setData] = useState<Candle[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isExportOpen, setIsExportOpen] = useState(false); // Modal State

  // Refs for logic that doesn't need immediate re-renders or to avoid closure staleness
  const positionsRef = useRef<Position[]>([]);
  const dataRef = useRef<Candle[]>([]);
  
  // Helpers
  const addLog = useCallback((message: string, type: BotLog['type'] = 'INFO') => {
    const newLog: BotLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      message,
      type
    };
    setLogs(prev => [...prev.slice(-49), newLog]); // Keep last 50
  }, []);

  // --- Core Engine Logic ---

  // 1. Session Manager
  useEffect(() => {
    const updateSession = () => {
      // Simulation: We cycle sessions faster than real time for demo
      // In real app, use new Date().getUTCHours()
      const tick = data.length; 
      const sessionCycle = tick % 300; // Cycle every 300 ticks
      
      let newSession = MarketSession.ASIAN;
      if (sessionCycle > 100 && sessionCycle <= 200) newSession = MarketSession.LONDON;
      if (sessionCycle > 200) newSession = MarketSession.NEW_YORK;

      if (newSession !== session) {
        setSession(newSession);
        addLog(`Session Change Detected: ${newSession}`, 'INFO');
        
        // AI Analysis Trigger on session change
        if (data.length > 20) {
           getMarketAnalysis(asset, data[data.length-1].close, trend, data[data.length-1].rsi, data.slice(-5))
            .then(res => {
              setAiAnalysis(res);
              addLog(`AI Strategy Update: ${res}`, 'AI');
            });
        }
      }
    };
    updateSession();
  }, [data.length, session, asset, trend, addLog, data]);

  // 2. Market Simulator
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Calculate session bias
      let bias = 0; 
      // London/NY tend to have stronger trends
      if (session !== MarketSession.ASIAN) {
        // Simple random trend bias for simulation
        const timeVal = Date.now();
        bias = Math.sin(timeVal / 10000); 
      }

      const volatilityMult = session === MarketSession.ASIAN ? 0.5 : 2.0;
      
      const newCandle = generateNextCandle(asset, dataRef.current, volatilityMult, bias);
      
      // Update Data State
      setData(prev => {
        const updated = [...prev, newCandle].slice(-60); // Keep last 60 candles
        dataRef.current = updated;
        return updated;
      });

      // Update Trend Analysis
      const newTrend = analyzeTrend(newCandle);
      setTrend(newTrend);

      // Execute Bot Logic
      runBotLogic(newCandle, newTrend);

    }, 1000); // 1 tick per second

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, asset, session]);


  // 3. Trading Strategy & Risk Management
  const runBotLogic = (currentCandle: Candle, currentTrend: TrendStatus) => {
    const currentPrice = currentCandle.close;
    let activePositions = [...positionsRef.current];
    let updatedPositions: Position[] = [];
    let currentEquity = balance;

    // --- A. Manage Open Positions (Risk Management) ---
    activePositions.forEach(pos => {
      if (!pos.isOpen) return;

      // 1. Calculate PnL
      const diff = pos.type === 'BUY' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
      const rawPnl = diff * pos.size;
      // Subtract spread/commissions implicitly in entry, here we just show raw
      pos.pnl = rawPnl;
      pos.currentPrice = currentPrice;

      // 2. Check Static SL/TP
      let closeReason = null;
      if (pos.type === 'BUY') {
        if (currentPrice <= pos.sl) closeReason = 'SL Hit';
        if (currentPrice >= pos.tp) closeReason = 'TP Hit';
      } else {
        if (currentPrice >= pos.sl) closeReason = 'SL Hit';
        if (currentPrice <= pos.tp) closeReason = 'TP Hit';
      }

      // 3. Trend Invalidation (Early Cut Loss)
      // Logic: If we are Long, but price crashes below Fast MA significantly, cut it before SL.
      const invalidationBuffer = ASSETS[asset].spread * 5;
      if (pos.type === 'BUY' && currentPrice < currentCandle.ma7 - invalidationBuffer && currentTrend === TrendStatus.DOWN) {
         closeReason = 'Trend Invalidated (Early Exit)';
      }
      if (pos.type === 'SELL' && currentPrice > currentCandle.ma7 + invalidationBuffer && currentTrend === TrendStatus.UP) {
         closeReason = 'Trend Invalidated (Early Exit)';
      }

      // 4. Step Trailing Stop (Protect Profit)
      // Logic: If profit > X, move SL to Entry + Y. If profit > 2X, move SL to Entry + 2Y.
      const stepSize = ASSETS[asset].spread * 20; // Define a significant step
      const secureStep = ASSETS[asset].spread * 10;
      
      if (pos.type === 'BUY') {
        const profitDistance = currentPrice - pos.entryPrice;
        const stepsTaken = Math.floor(profitDistance / stepSize);
        
        if (stepsTaken > pos.trailingStepCount) {
          // Move SL Up
          const newSL = pos.entryPrice + (stepsTaken * secureStep);
          if (newSL > pos.sl) { // NEVER move SL down
            pos.sl = newSL;
            pos.trailingStepCount = stepsTaken;
            addLog(`Trailing Stop Activated: Locked profit at ${newSL.toFixed(2)}`, 'SUCCESS');
          }
        }
      } else {
        const profitDistance = pos.entryPrice - currentPrice;
        const stepsTaken = Math.floor(profitDistance / stepSize);
        
        if (stepsTaken > pos.trailingStepCount) {
          // Move SL Down
          const newSL = pos.entryPrice - (stepsTaken * secureStep);
          if (newSL < pos.sl) { // NEVER move SL up (for sell)
            pos.sl = newSL;
            pos.trailingStepCount = stepsTaken;
            addLog(`Trailing Stop Activated: Locked profit at ${newSL.toFixed(2)}`, 'SUCCESS');
          }
        }
      }

      // Execute Close
      if (closeReason) {
        pos.isOpen = false;
        setBalance(prev => prev + pos.pnl);
        addLog(`Position Closed [${closeReason}]: PnL ${pos.pnl.toFixed(2)}`, pos.pnl > 0 ? 'SUCCESS' : 'WARNING');
      } else {
        updatedPositions.push(pos);
      }
      
      if (pos.isOpen) currentEquity += pos.pnl;
    });

    // --- B. Entry Logic (Strategy) ---
    // Only open if no position is active (Simple logic for safety)
    if (updatedPositions.length === 0) {
      const rsi = currentCandle.rsi;
      const spread = ASSETS[asset].spread;
      let signal: 'BUY' | 'SELL' | null = null;
      let reason = "";

      // Strategy 1: Asian Session (Scalp / Mean Reversion)
      if (session === MarketSession.ASIAN) {
        if (rsi < 30 && currentTrend !== TrendStatus.DOWN) {
           signal = 'BUY';
           reason = "Asian Scalp: RSI Oversold";
        } else if (rsi > 70 && currentTrend !== TrendStatus.UP) {
           signal = 'SELL';
           reason = "Asian Scalp: RSI Overbought";
        }
      } 
      // Strategy 2: London/NY (Trend Following)
      else {
        // MA Crossover + Momentum
        if (currentCandle.ma7 > currentCandle.ma25 && currentTrend === TrendStatus.UP && rsi < 70) {
          // Wait for pullbacks in uptrend? Or breakout?
          // Simple breakout logic here
           signal = 'BUY';
           reason = "Trend Follow: MA Cross UP";
        } else if (currentCandle.ma7 < currentCandle.ma25 && currentTrend === TrendStatus.DOWN && rsi > 30) {
           signal = 'SELL';
           reason = "Trend Follow: MA Cross DOWN";
        }
      }

      if (signal) {
        const size = 1; // Standard lot size simulation
        // Smart SL/TP calculation
        // Volatility based:
        const atrProxy = Math.abs(currentCandle.high - currentCandle.low) * 3;
        const stopDistance = Math.max(atrProxy, spread * 10);
        
        const sl = signal === 'BUY' ? currentPrice - stopDistance : currentPrice + stopDistance;
        const tp = signal === 'BUY' ? currentPrice + (stopDistance * 2) : currentPrice - (stopDistance * 2); // 1:2 R:R

        const newPos: Position = {
          id: Math.random().toString(36).substr(2, 9),
          asset,
          type: signal,
          entryPrice: currentPrice,
          size,
          sl,
          tp,
          currentPrice,
          pnl: 0,
          isOpen: true,
          timestamp: Date.now(),
          trailingStepCount: 0
        };

        updatedPositions.push(newPos);
        addLog(`Opening ${signal}: ${reason} @ ${currentPrice.toFixed(2)}`, 'INFO');
      }
    }

    setPositions(updatedPositions);
    positionsRef.current = updatedPositions;
    setEquity(currentEquity);
  };

  // Manual Close
  const handleManualClose = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (pos) {
      setBalance(prev => prev + pos.pnl);
      setPositions([]);
      positionsRef.current = [];
      addLog(`Manual Override: Position closed by user. PnL: ${pos.pnl.toFixed(2)}`, 'WARNING');
    }
  };

  const toggleRun = () => {
    setIsRunning(!isRunning);
    addLog(isRunning ? "Bot Paused." : "Bot Started.", 'INFO');
  };

  // Reset data on asset change
  const changeAsset = (newAsset: AssetType) => {
    setAsset(newAsset);
    setPositions([]);
    positionsRef.current = [];
    setData([]);
    dataRef.current = [];
    addLog(`Switched Asset to ${newAsset}`, 'INFO');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 md:p-8">
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              SENTINEL AI TRADER
            </h1>
            <p className="text-slate-500 text-sm">Autonomous Algorithmic Trading System v2.5</p>
          </div>
          {aiAnalysis && (
            <div className="bg-slate-800/80 p-3 rounded-lg border border-purple-500/30 max-w-lg flex gap-3 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
               <BrainCircuit className="text-purple-400 shrink-0 mt-1" size={20} />
               <div>
                 <p className="text-xs text-purple-300 font-bold mb-1">AI MARKET INSIGHT</p>
                 <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysis}</p>
               </div>
            </div>
          )}
        </header>

        <ControlPanel 
          balance={balance}
          equity={equity}
          selectedAsset={asset}
          onAssetChange={changeAsset}
          session={session}
          trend={trend}
          openPositions={positions}
          onManualClose={handleManualClose}
          isRunning={isRunning}
          onToggleRun={toggleRun}
          onExport={() => setIsExportOpen(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <TradingChart data={data} positions={positions} asset={asset} />
          </div>
          <div className="lg:col-span-1">
             <TradeLog logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;