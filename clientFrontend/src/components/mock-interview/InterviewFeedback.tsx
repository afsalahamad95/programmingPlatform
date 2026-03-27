import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Activity, Target, CheckCircle, AlertTriangle, Award } from "lucide-react";
import { ParsedFeedback } from "../../hooks/mock-interview/useInterviewEngine";

interface InterviewFeedbackProps {
  feedback: ParsedFeedback;
  onRetry: () => void;
}

export function InterviewFeedback({ feedback, onRetry }: InterviewFeedbackProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-10 animate-slide-up shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <CheckCircle className="w-96 h-96 text-indigo-500" />
      </div>

      <div className="flex justify-between items-center mb-10 relative z-10">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-indigo-400" />
          Intelligence Report
        </h2>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          New Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Vector Analysis */}
        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[400px] shadow-inner">
          <h3 className="text-lg font-bold tracking-widest uppercase text-white mb-4 self-start flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" /> Vector Analysis
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={feedback.chartData}>
              <PolarGrid stroke="#4f46e5" strokeOpacity={0.3} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#d1d5db", fontSize: 13, fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#818cf8"
                strokeWidth={3}
                fill="#6366f1"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Feedback Details */}
        <div className="space-y-6 flex flex-col justify-center">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 hover:bg-emerald-500/20 transition-colors">
            <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-lg">
              <CheckCircle className="w-6 h-6" /> Strengths
            </h3>
            <ul className="space-y-3">
              {feedback.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-3 text-emerald-50 font-medium">
                  <span className="text-emerald-500 mt-1">✓</span> {str}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 hover:bg-amber-500/20 transition-colors">
            <h3 className="text-amber-400 font-bold mb-4 flex items-center gap-2 text-lg">
              <AlertTriangle className="w-6 h-6" /> Growth Areas
            </h3>
            <ul className="space-y-3">
              {feedback.weaknesses.map((weak, idx) => (
                <li key={idx} className="flex items-start gap-3 text-amber-50 font-medium">
                  <span className="text-amber-500 mt-1">⚡</span> {weak}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-2xl p-6">
            <h3 className="text-indigo-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Award className="w-4 h-4" /> Final Verdict
            </h3>
            <p className="text-white font-semibold text-lg italic leading-relaxed">
              "{feedback.verdict}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
