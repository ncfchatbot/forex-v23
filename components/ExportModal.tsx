import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MQL5_CODE = `//+------------------------------------------------------------------+
//|                            THE_HARVESTER_TITANIUM_v23.mq5         |
//|                 M15 GOLD SCALPER (Dynamic Step + Auto-Wait)       |
//+------------------------------------------------------------------+
#property copyright "PRO ALGO ARCHITECT"
#property version   "23.00"
#property strict

#include <Trade\\Trade.mqh>

//--- INPUTS: Risk & Spread
input group "== TITANIUM SETTINGS =="
input double InpRiskPerTrade    = 1.0;     // Risk 1%
input int    InpMaxSpreadPoints = 350;     // Spread Max (35 pips - ทองผันผวนรับได้)

//--- INPUTS: Dynamic Trailing (หัวใจสำคัญ v23)
input group "== DYNAMIC STEP TRAILING =="
input int    InpTrailingStart   = 150;     // เริ่มทำงานเมื่อกำไร 150 จุด (15 pips)
input int    InpTrailingStep    = 50;      // ระยะห่าง Trailing 50 จุด (5 pips)
// Logic: เมื่อราคาไป 150 จุด, SL จะตามมาห่างราคา 50 จุด และขยับตามทุก tick ที่ทำ New High/Low ได้

//--- INPUTS: Engine
input group "== ENGINE LOGIC =="
input int InpEMA_Trend  = 200;              
input int InpRSI_Period = 14;              

CTrade trade;
int handleEMA, handleRSI;
datetime lastBarTime = 0; // ตัวแปรสำหรับระบบ Smart Wait (New Bar)

int OnInit() {
   handleEMA = iMA(_Symbol, PERIOD_M15, InpEMA_Trend, 0, MODE_EMA, PRICE_CLOSE);
   handleRSI = iRSI(_Symbol, PERIOD_M15, InpRSI_Period, PRICE_CLOSE);
   
   if(handleEMA == INVALID_HANDLE || handleRSI == INVALID_HANDLE) return(INIT_FAILED);

   trade.SetExpertMagicNumber(2300); // Magic Number v23 (ไม่ชนตัวเก่า)
   trade.SetDeviationInPoints(20);
   
   Print(">>> TITANIUM v23: READY TO HARVEST <<<");
   return(INIT_SUCCEEDED);
}

void OnTick() {
   // 1. ระบบ Trailing Stop แบบ Dynamic (ทำงานทุก Tick เพื่อความคม)
   ManageDynamicTrailing();

   // 2. ถ้ามีออเดอร์ค้างอยู่ ให้โฟกัสการแก้/กันกำไร ไม่เปิดเพิ่ม
   if(PositionsTotal() > 0) return;

   // 3. ระบบ Smart Wait: เช็คจบแท่งเทียนเท่านั้น
   // ป้องกันกรณีปิดมือแล้วบอทเปิดสวนทันที ระบบจะรอจนกว่าจะขึ้นแท่งใหม่
   if(!IsNewBar()) return;

   // 4. เช็ค Spread ก่อนเข้า
   if((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) > InpMaxSpreadPoints) {
      Print("Spread too high (" + (string)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) + "), waiting...");
      return;
   }

   // 5. Signal Logic
   double ema_buf[1], rsi_buf[1];
   // ใช้ราคาปิดแท่ง 1 (Confirmed Candle) แม่นยำกว่าแท่ง 0 ที่ยังวิง
   if(CopyBuffer(handleEMA, 0, 1, 1, ema_buf) < 0) return; 
   if(CopyBuffer(handleRSI, 0, 1, 1, rsi_buf) < 0) return; 

   double close1 = iClose(_Symbol, PERIOD_M15, 1);
   double ema = ema_buf[0];
   double rsi = rsi_buf[0];

   // --- STRATEGY TITANIUM ---
   // SELL Condition: ราคาปิดใต้ EMA200 (ขาลง) + RSI < 45 (โมเมนตัมลง)
   if(close1 < ema && rsi < 45) {
      OpenTrade(ORDER_TYPE_SELL);
   } 
   // BUY Condition: ราคาปิดเหนือ EMA200 (ขาขึ้น) + RSI > 55 (โมเมนตัมขึ้น)
   else if(close1 > ema && rsi > 55) {
      OpenTrade(ORDER_TYPE_BUY);
   }
}

//+------------------------------------------------------------------+
//| เช็คการขึ้นแท่งเทียนใหม่ (New Bar Check)                           |
//+------------------------------------------------------------------+
bool IsNewBar() {
   datetime currentBarTime = iTime(_Symbol, PERIOD_M15, 0);
   if(lastBarTime != currentBarTime) {
      lastBarTime = currentBarTime;
      return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| เปิดออเดอร์                                                       |
//+------------------------------------------------------------------+
void OpenTrade(ENUM_ORDER_TYPE type) {
   double price = (type == ORDER_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   
   // ตั้ง SL กันตายไว้ก่อน (Safety) 
   // ระบบ Trailing จะมาจัดการต่อเมื่อกำไร
   double initial_sl_dist = 800 * _Point; // 800 จุด (80 pips) ทองเหวี่ยงแรง
   
   double sl = (type == ORDER_TYPE_BUY) ? price - initial_sl_dist : price + initial_sl_dist;
   double tp = 0; // No TP, Let Profit Run
   
   double lot = CalculateLot(initial_sl_dist);

   if(type == ORDER_TYPE_BUY) trade.Buy(lot, _Symbol, price, sl, tp, "Titanium v23");
   else trade.Sell(lot, _Symbol, price, sl, tp, "Titanium v23");
}

//+------------------------------------------------------------------+
//| Dynamic Step Trailing (เลื่อนตามกำไร ไม่ถอยหลัง)                    |
//+------------------------------------------------------------------+
void ManageDynamicTrailing() {
   for(int i=PositionsTotal()-1; i>=0; i--) {
      if(PositionSelectByTicket(PositionGetTicket(i))) {
         if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
         if(PositionGetInteger(POSITION_MAGIC) != 2300) continue;

         ulong ticket = PositionGetTicket(i);
         long type = PositionGetInteger(POSITION_TYPE);
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         double currentSL = PositionGetDouble(POSITION_SL);
         double currentTP = PositionGetDouble(POSITION_TP);
         double point = _Point;

         // --- BUY LOGIC ---
         if(type == POSITION_TYPE_BUY) {
            double currentBid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
            
            // 1. เช็คว่ากำไรเกินจุด Start หรือยัง (เช่น กำไร > 150 จุด)
            if(currentBid - openPrice > InpTrailingStart * point) {
               // 2. คำนวณ SL เป้าหมาย (ราคาปัจจุบัน - ระยะห่าง Step)
               double targetSL = currentBid - (InpTrailingStep * point);
               
               // 3. กฎเหล็ก: ย้ายขึ้นเท่านั้น (targetSL ต้องสูงกว่า SL เดิม)
               if(targetSL > currentSL) {
                  trade.PositionModify(ticket, targetSL, currentTP);
               }
            }
         }
         // --- SELL LOGIC ---
         else if(type == POSITION_TYPE_SELL) {
            double currentAsk = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
            
            // 1. เช็คกำไร (ราคาเปิด - ราคาปัจจุบัน > Start)
            if(openPrice - currentAsk > InpTrailingStart * point) {
               // 2. คำนวณ SL เป้าหมาย (ราคาปัจจุบัน + ระยะห่าง Step)
               double targetSL = currentAsk + (InpTrailingStep * point);
               
               // 3. กฎเหล็ก: ย้ายลงเท่านั้น (targetSL ต้องต่ำกว่า SL เดิม หรือ SL เดิมเป็น 0)
               if(targetSL < currentSL || currentSL == 0) {
                  trade.PositionModify(ticket, targetSL, currentTP);
               }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| คำนวณ Lot Size (Risk %)                                         |
//+------------------------------------------------------------------+
double CalculateLot(double sl_dist) {
   double risk_amt = AccountInfoDouble(ACCOUNT_BALANCE) * (InpRiskPerTrade / 100.0);
   double tick_val = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tick_val == 0) tick_val = 1;
   
   double lot = risk_amt / (sl_dist / _Point * tick_val);
   lot = NormalizeDouble(lot, 2);
   
   double min = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double max = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(lot < min) lot = min;
   if(lot > max) lot = max;
   return lot;
}
`;

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(MQL5_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">MQL5</span> Harvester Titanium v23
            </h2>
            <p className="text-slate-400 text-xs mt-1">Dynamic Step Trailing + Smart Wait Logic (New Bar)</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="text-slate-400" size={20} />
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
          <pre className="text-xs md:text-sm font-mono text-slate-300 whitespace-pre">
            <code>{MQL5_CODE}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800 rounded-b-xl flex justify-between items-center">
          <p className="text-xs text-slate-500">
            *Always backtest on a Demo account first.
          </p>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
              copied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? <><Check size={18} /> COPIED</> : <><Copy size={18} /> COPY CODE</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;