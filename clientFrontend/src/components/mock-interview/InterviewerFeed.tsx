import { Bot } from "lucide-react";

interface InterviewerFeedProps {
  isTyping: boolean;
  isAiSpeaking: boolean;
  isStarted: boolean;
  complexity: number;
  depthOfAnalysis: number;
  statusText: string;
}

export function InterviewerFeed({
  isTyping,
  isAiSpeaking,
  isStarted,
  complexity,
  depthOfAnalysis,
  statusText,
}: InterviewerFeedProps) {
  return (
    <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video group">
      {/* Background / Placeholder for AI Video (if any) */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-indigo-500/5 animate-pulse" />
      </div>

      {/* Top Status Bar */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3 z-10">
        <div className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStarted ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isStarted ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
        </div>
        <span className="text-xs font-bold tracking-wider uppercase text-white/90">
          {statusText}
        </span>
      </div>

      {/* AI Portrait (Bottom Right) */}
      <div className={`absolute bottom-6 right-6 w-32 h-40 sm:w-48 sm:h-64 bg-gray-900/80 backdrop-blur-xl rounded-2xl border-2 transition-all duration-500 overflow-hidden shadow-2xl flex flex-col items-center justify-center ${isTyping || isAiSpeaking ? 'border-indigo-500 shadow-indigo-500/20' : 'border-white/10'}`}>
        <div className={`absolute top-4 right-4 flex gap-1 ${isAiSpeaking ? 'opacity-100' : 'opacity-0'}`}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <Bot className={`w-16 h-16 transition-all duration-500 ${isTyping ? 'text-indigo-400 animate-bounce' : isAiSpeaking ? 'text-indigo-300 scale-110' : isStarted ? 'text-indigo-300/50' : 'text-gray-600'}`} />
        <div className="mt-4 flex flex-col items-center">
          <span className="text-[10px] font-black text-white bg-indigo-600/50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg">
            {isTyping ? 'Thinking...' : isAiSpeaking ? 'Speaking...' : 'AI INTERVIEWER'}
          </span>
        </div>
      </div>

      {/* Holographic Depth Meter (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              style={{ width: `${depthOfAnalysis}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-indigo-300 tracking-tighter uppercase tabular-nums">
            Zenith Sync: {depthOfAnalysis}%
          </span>
        </div>
        <div className="flex gap-1.5">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i} 
              className={`h-4 w-1 rounded-sm transition-all duration-500 ${i < Math.floor(complexity) ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-white/5'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
