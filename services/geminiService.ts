import { GoogleGenAI } from "@google/genai";
import { AssetType, Candle, TrendStatus } from "../types";

// NOTE: In a real app, API_KEY should be in process.env. 
// For this demo, we assume the environment is set up correctly.

export const getMarketAnalysis = async (
  asset: AssetType,
  currentPrice: number,
  trend: TrendStatus,
  rsi: number,
  lastCandles: Candle[]
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "AI System: API Key missing. Running in autonomous fail-safe mode.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Calculate simple volatility from last 5 candles
    const recentVolatility = Math.abs(lastCandles[lastCandles.length-1].close - lastCandles[lastCandles.length-5].close);

    const prompt = `
      You are an elite Forex and Crypto trading algorithm named "Sentinel".
      Analyze this real-time market data snapshot:
      
      Asset: ${asset}
      Current Price: ${currentPrice.toFixed(4)}
      Detected Trend: ${trend}
      RSI (14): ${rsi.toFixed(2)}
      Recent 5-candle movement: ${recentVolatility.toFixed(4)}

      Instructions:
      1. Determine if the market is Ranging (Sideways) or Trending.
      2. Suggest a strategy: "Scalp" for ranging, "Swing" for trending.
      3. Identify immediate support/resistance levels based on the price.
      4. Be concise, technical, and direct (max 50 words). No disclaimers.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7
      }
    });

    return response.text || "AI Analysis unavailable.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI Connection Interrupted. Using internal heuristic fallback.";
  }
};