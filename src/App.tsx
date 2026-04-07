import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { Upload, Activity, AlertCircle, BarChart3, Loader2 } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Timeframe = 'HTF' | 'MTF' | 'LTF';

interface ChartImage {
  file: File;
  previewUrl: string;
  base64: string;
}

export default function App() {
  const [charts, setCharts] = useState<Record<Timeframe, ChartImage | null>>({
    HTF: null,
    MTF: null,
    LTF: null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (tf: Timeframe, file: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setCharts(prev => ({
        ...prev,
        [tf]: {
          file,
          previewUrl: URL.createObjectURL(file),
          base64: base64String
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const analyzeCharts = async () => {
    if (!charts.HTF && !charts.MTF && !charts.LTF) {
      setError("Please upload at least one chart to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const parts: any[] = [
        {
          text: `You are a professional forex trader and quantitative analyst.

I have provided multi-timeframe charts (HTF, MTF, LTF).

Your task is to analyze the market using ONLY:
* Bollinger Bands
* Standard Deviation (volatility behavior)

Follow these steps strictly:

1. MARKET STRUCTURE (HTF - H1/H4/D1)
* Identify trend direction (bullish, bearish, ranging)
* Analyze Bollinger Bands:
  * Is price riding upper/lower band?
  * Is the band expanding or squeezing?
* Analyze Standard Deviation:
  * Is volatility low (compression) or high (expansion)?
* Conclusion: overall bias (BUY / SELL / RANGE)

2. MID-TIMEFRAME CONFIRMATION (M15–M30)
* Confirm HTF bias
* Check if Bollinger Bands support continuation or reversal
* Observe Standard Deviation:
  * Increasing → momentum building
  * Decreasing → consolidation
* Identify key zones (breakout or rejection)

3. ENTRY TIMEFRAME (M1–M5)
* Look for:
  * Bollinger Band breakout or rejection
  * Volatility expansion (Standard Deviation rising)
* Avoid entries when volatility is too high (late move)

4. TRADE DECISION
Give a clear answer:
* Trade: BUY / SELL / NO TRADE
* Entry price (zone)
* Stop Loss
* Take Profit (1:2 or 1:3 RR)

5. CONFIDENCE SCORE
* Rate the setup from 1 to 10
* Explain briefly why

6. WARNINGS
* Mention if market is choppy or risky
* Mention if volatility is too high or too low

Rules:
* Do NOT guess
* Do NOT overtrade
* Only give a trade if conditions align
* Focus on volatility behavior + band structure`
        }
      ];

      if (charts.HTF) {
        parts.push({ text: "Here is the Higher Timeframe (HTF) chart:" });
        parts.push({ inlineData: { data: charts.HTF.base64, mimeType: charts.HTF.file.type } });
      }
      if (charts.MTF) {
        parts.push({ text: "Here is the Mid Timeframe (MTF) chart:" });
        parts.push({ inlineData: { data: charts.MTF.base64, mimeType: charts.MTF.file.type } });
      }
      if (charts.LTF) {
        parts.push({ text: "Here is the Lower Timeframe (LTF) chart:" });
        parts.push({ inlineData: { data: charts.LTF.base64, mimeType: charts.LTF.file.type } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          temperature: 0,
        }
      });

      setAnalysis(response.text || "No analysis generated.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ChartUploader = ({ title, tf }: { title: string, tf: Timeframe }) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-300">{title}</label>
      <div className="relative group border-2 border-dashed border-slate-700 rounded-xl overflow-hidden bg-slate-800/50 hover:bg-slate-800 transition-colors h-48 flex items-center justify-center">
        {charts[tf] ? (
          <>
            <img src={charts[tf]!.previewUrl} alt={`${tf} Chart`} className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="cursor-pointer bg-slate-900/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900">
                Change Image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(tf, e.target.files[0])} />
              </label>
            </div>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-200">
            <Upload className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Upload {tf} Chart</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(tf, e.target.files[0])} />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        
        <header className="mb-10 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Quant Analyst Pro</h1>
          </div>
          <p className="text-slate-400 text-lg">Multi-Timeframe Bollinger Bands & Volatility Analysis</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Uploads & Controls */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-400" />
                Chart Inputs
              </h2>
              
              <div className="space-y-5">
                <ChartUploader title="Higher Timeframe (H1/H4/D1)" tf="HTF" />
                <ChartUploader title="Mid Timeframe (M15-M30)" tf="MTF" />
                <ChartUploader title="Lower Timeframe (M1-M5)" tf="LTF" />
              </div>

              <button
                onClick={analyzeCharts}
                disabled={isAnalyzing || (!charts.HTF && !charts.MTF && !charts.LTF)}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Market...
                  </>
                ) : (
                  <>
                    <Activity className="w-5 h-5" />
                    Run Quant Analysis
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl min-h-[600px]">
              {analysis ? (
                <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white">
                  <div className="markdown-body">
                    <Markdown>{analysis}</Markdown>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500/50" />
                  <p className="text-lg animate-pulse">Running quantitative models...</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-20 text-center">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-10 h-10 text-slate-600" />
                  </div>
                  <h3 className="text-xl font-medium text-slate-300">Awaiting Market Data</h3>
                  <p className="max-w-md text-slate-500">
                    Upload your multi-timeframe charts on the left to generate a strict, volatility-based trading analysis.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
