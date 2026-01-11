import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Candle, Position } from '../types';
import { COLORS, ASSETS } from '../constants';

interface TradingChartProps {
  data: Candle[];
  positions: Position[];
  asset: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ data, positions, asset }) => {
  // Determine domain for Y Axis to keep chart centered
  const closes = data.map(d => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const padding = (max - min) * 0.1;

  const activeBuy = positions.find(p => p.isOpen && p.type === 'BUY');
  const activeSell = positions.find(p => p.isOpen && p.type === 'SELL');
  
  // Safe access to asset config
  const assetConfig = ASSETS[asset as keyof typeof ASSETS];
  const timeframe = assetConfig ? assetConfig.recommendedTimeframe : 'M1';

  return (
    <div className="h-[400px] w-full bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-xl">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-slate-300 font-bold text-sm uppercase tracking-wider">{asset}</h3>
          <span className="text-emerald-400 text-xs font-bold bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800">
             {timeframe}
          </span>
        </div>
        <div className="flex gap-4 text-xs">
          <span style={{ color: COLORS.maFast }}>MA7 (Fast)</span>
          <span style={{ color: COLORS.maSlow }}>MA25 (Slow)</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.chartLine} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.chartLine} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            tick={{fontSize: 10}}
            interval={Math.floor(data.length / 5)}
          />
          <YAxis 
            domain={[min - padding, max + padding]} 
            stroke="#94a3b8" 
            tick={{fontSize: 10}}
            width={60}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ fontSize: 12 }}
            labelStyle={{ color: '#94a3b8', marginBottom: 5 }}
          />
          
          <Area 
            type="monotone" 
            dataKey="close" 
            stroke={COLORS.chartLine} 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            strokeWidth={2}
            isAnimationActive={false}
          />
          
          <Area 
            type="monotone" 
            dataKey="ma7" 
            stroke={COLORS.maFast} 
            fill="none" 
            strokeWidth={1} 
            dot={false}
            isAnimationActive={false}
          />
          
          <Area 
            type="monotone" 
            dataKey="ma25" 
            stroke={COLORS.maSlow} 
            fill="none" 
            strokeWidth={1} 
            dot={false}
            isAnimationActive={false}
          />

          {activeBuy && (
             <ReferenceLine y={activeBuy.entryPrice} stroke={COLORS.buy} strokeDasharray="3 3" label={{ value: 'BUY', fill: COLORS.buy, fontSize: 10, position: 'right' }} />
          )}
          {activeBuy && (
             <ReferenceLine y={activeBuy.sl} stroke="#ef4444" label={{ value: 'SL', fill: '#ef4444', fontSize: 10, position: 'right' }} />
          )}

          {activeSell && (
             <ReferenceLine y={activeSell.entryPrice} stroke={COLORS.sell} strokeDasharray="3 3" label={{ value: 'SELL', fill: COLORS.sell, fontSize: 10, position: 'right' }} />
          )}
           {activeSell && (
             <ReferenceLine y={activeSell.sl} stroke="#ef4444" label={{ value: 'SL', fill: '#ef4444', fontSize: 10, position: 'right' }} />
          )}

        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TradingChart;