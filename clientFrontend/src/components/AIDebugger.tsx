import React, { useState } from "react";
import { Bug, Zap, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { chatApi } from "../api/chatApi";
import { useAuth } from "../contexts/AuthContext";

interface AIDebuggerProps {
  code: string;
  language: string;
  errorOutput?: string | null;
  /** Called when the user accepts a corrected snippet */
  onApplyFix?: (snippet: string) => void;
}

type Panel = "debug" | "analyze" | null;

export const AIDebugger: React.FC<AIDebuggerProps> = ({ code, language, errorOutput, onApplyFix }) => {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [debugResult, setDebugResult] = useState<{
    root_cause: string;
    fix_steps: string[];
    corrected_snippet?: string;
    explanation: string;
  } | null>(null);

  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    issues: string[];
    suggestions: string[];
    complexity: string;
    summary: string;
  } | null>(null);

  const toggle = (panel: Panel) => {
    setActivePanel(prev => (prev === panel ? null : panel));
    setError(null);
  };

  const handleDebug = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setDebugResult(null);
    toggle("debug");
    try {
      const result = await chatApi.debugCode(
        code,
        language,
        errorOutput ?? "No explicit error — analyse for potential bugs",
        user?.id
      );
      setDebugResult(result);
    } catch (e: any) {
      setError(e.message ?? "Debug request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    toggle("analyze");
    try {
      const result = await chatApi.analyzeCode(code, language, user?.id);
      setAnalysisResult(result);
    } catch (e: any) {
      setError(e.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-rose-400";
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0d1117]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2">AI Assistant</span>

        <button
          onClick={handleDebug}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition-all disabled:opacity-50"
        >
          {loading && activePanel === "debug" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Bug className="w-3.5 h-3.5" />
          )}
          Debug
          {activePanel === "debug" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
        >
          {loading && activePanel === "analyze" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          Analyze
          {activePanel === "analyze" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Panels */}
      {error && (
        <div className="px-4 py-3 flex items-center gap-2 text-rose-400 text-sm bg-rose-500/5 border-b border-rose-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="px-4 py-6 flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs font-mono tracking-widest">
            {activePanel === "debug" ? "Analysing errors…" : "Reviewing code…"}
          </span>
        </div>
      )}

      {!loading && activePanel === "debug" && debugResult && (
        <div className="p-4 space-y-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Root Cause</p>
            <p className="text-gray-300 leading-relaxed">{debugResult.root_cause}</p>
          </div>

          {debugResult.fix_steps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Fix Steps</p>
              <ol className="space-y-1 list-none">
                {debugResult.fix_steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-gray-300">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Explanation</p>
            <p className="text-gray-400 leading-relaxed">{debugResult.explanation}</p>
          </div>

          {debugResult.corrected_snippet && onApplyFix && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Suggested Fix</p>
              <pre className="text-xs text-gray-300 bg-black/40 rounded-lg p-3 overflow-x-auto border border-white/5 font-mono">
                {debugResult.corrected_snippet}
              </pre>
              <button
                onClick={() => onApplyFix(debugResult.corrected_snippet!)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Apply Fix
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && activePanel === "analyze" && analysisResult && (
        <div className="p-4 space-y-4 text-sm">
          {/* Score */}
          <div className="flex items-center gap-3">
            <div className={`text-4xl font-black font-mono ${scoreColor(analysisResult.score)}`}>
              {analysisResult.score}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Code Quality Score</p>
              <p className="text-gray-400 text-xs">Complexity: <span className="text-white font-bold">{analysisResult.complexity}</span></p>
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed">{analysisResult.summary}</p>

          {analysisResult.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Issues Found</p>
              <ul className="space-y-1">
                {analysisResult.issues.map((issue, i) => (
                  <li key={i} className="flex gap-2 text-gray-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Suggestions</p>
              <ul className="space-y-1">
                {analysisResult.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-gray-300">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0 text-indigo-400 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIDebugger;
