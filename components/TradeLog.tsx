import React, { useEffect, useRef } from 'react';
import { BotLog } from '../types';
import { Terminal, BrainCircuit, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TradeLogProps {
  logs: BotLog[];
}

const TradeLog: React.FC<TradeLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (type: BotLog['type']) => {
    switch(type) {
      case 'AI': return <BrainCircuit size={14} className="text-purple-400" />;
      case 'ERROR': return <AlertCircle size={14} className="text-red-500" />;
      case 'SUCCESS': return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'WARNING': return <AlertCircle size={14} className="text-amber-400" />;
      default: return <Terminal size={14} className="text-slate-400" />;
    }
  };

  const getColor = (type: BotLog['type']) => {
    switch(type) {
      case 'AI': return 'text-purple-300';
      case 'ERROR': return 'text-red-300';
      case 'SUCCESS': return 'text-emerald-300';
      case 'WARNING': return 'text-amber-300';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 flex flex-col h-[400px]">
      <div className="p-3 border-b border-slate-700 bg-slate-800 rounded-t-lg flex items-center gap-2">
        <Terminal size={16} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">System Logic & Execution Log</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        {logs.length === 0 && <p className="text-slate-600 italic">System initializing...</p>}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 animate-in fade-in duration-300">
            <span className="text-slate-500 whitespace-nowrap min-w-[60px]">{log.timestamp}</span>
            <div className="mt-0.5">{getIcon(log.type)}</div>
            <span className={`${getColor(log.type)} break-words leading-tight`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TradeLog;