import React from 'react';
import { AssetType, MarketSession, Position, TrendStatus } from '../types';
import { ASSETS } from '../constants';
import { Activity, ShieldCheck, Zap, Power, AlertTriangle, FileCode, Clock } from 'lucide-react';

interface ControlPanelProps {
  balance: number;
  equity: number;
  selectedAsset: AssetType;
  onAssetChange: (asset: AssetType) => void;
  session: MarketSession;
  trend: TrendStatus;
  openPositions: Position[];
  onManualClose: (id: string) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onExport: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  balance,
  equity,
  selectedAsset,
  onAssetChange,
  session,
  trend,
  openPositions,
  onManualClose,
  isRunning,
  onToggleRun,
  onExport
}) => {
  const profit = equity - balance;
  const isProfit = profit >= 0;
  const recommendedTF = ASSETS[selectedAsset].recommendedTimeframe;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
      {/* Stats Card */}
      <div className="col-span-12 md:col-span-7 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg flex flex-wrap gap-6 items-center">
        <div>
          <p className="text-slate-400 text-xs uppercase font-bold">Balance</p>
          <p className="text-2xl font-mono text-white">${balance.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs uppercase font-bold">Equity</p>
          <p className={`text-2xl font-mono ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            ${equity.toFixed(2)}
          </p>
        </div>
        <div className="h-10 w-px bg-slate-600 mx-2"></div>
        <div>
           <p className="text-slate-400 text-xs uppercase font-bold">Session</p>
           <div className="flex items-center gap-2">
             <Activity size={16} className="text-blue-400" />
             <span className="text-slate-200 text-sm font-semibold">{session}</span>
           </div>
        </div>
        <div>
           <p className="text-slate-400 text-xs uppercase font-bold">Best TF</p>
           <div className="flex items-center gap-2">
             <Clock size={16} className="text-amber-400" />
             <span className="text-slate-200 text-sm font-mono font-bold">{recommendedTF}</span>
           </div>
        </div>
      </div>

      {/* Control Card */}
      <div className="col-span-12 md:col-span-5 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg flex flex-col justify-between">
        <div className="flex gap-2 mb-4">
          {(['BTCUSD', 'XAUUSD', 'EURUSD'] as AssetType[]).map(asset => (
            <button
              key={asset}
              onClick={() => onAssetChange(asset)}
              className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${
                selectedAsset === asset 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {asset}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={onToggleRun}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded font-bold text-sm transition-all ${
               isRunning 
               ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
               : 'bg-slate-600 text-slate-300'
             }`}
           >
             <Power size={16} />
             {isRunning ? 'ACTIVE' : 'PAUSED'}
           </button>

           <button 
             onClick={onExport}
             className="flex-1 flex items-center justify-center gap-2 py-2 rounded font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
           >
             <FileCode size={16} />
             MQL5
           </button>
           
           {openPositions.length > 0 && (
              <button 
                onClick={() => onManualClose(openPositions[0].id)}
                className="px-4 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs flex items-center gap-1"
              >
                <AlertTriangle size={14} />
              </button>
           )}
        </div>
      </div>
      
      {/* Active Trades Panel */}
      {openPositions.length > 0 && (
         <div className="col-span-12 bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
               <ShieldCheck className="text-emerald-500" size={20} />
               <div>
                  <p className="text-xs text-slate-400 font-bold">ACTIVE PROTECTION</p>
                  <p className="text-sm text-slate-200">
                    Trailing Step: <span className="text-emerald-400 font-mono">
                      {openPositions[0].trailingStepCount}
                    </span> | 
                    Type: <span className={`font-bold ${openPositions[0].type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {openPositions[0].type}
                    </span>
                  </p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-xs text-slate-400">Current PnL</p>
               <p className={`text-xl font-mono font-bold ${openPositions[0].pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                 {openPositions[0].pnl > 0 ? '+' : ''}{openPositions[0].pnl.toFixed(2)}
               </p>
            </div>
         </div>
      )}
    </div>
  );
};

export default ControlPanel;