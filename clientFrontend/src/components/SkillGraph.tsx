import React, { useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { BrainCircuit, TrendingUp, Award } from "lucide-react";

interface SkillData {
  [skill: string]: number; // skill name → score 0-100
}

interface SkillGraphProps {
  skills: SkillData;
  title?: string;
  /** Show radar chart instead of bar graph */
  mode?: "radar" | "bars";
}

const TIER_COLORS: Record<string, string> = {
  expert: "from-emerald-500 to-teal-400",
  advanced: "from-indigo-500 to-violet-400",
  intermediate: "from-yellow-500 to-amber-400",
  beginner: "from-rose-500 to-orange-400",
};

const TIER_LABELS: Record<string, string> = {
  expert: "Expert",
  advanced: "Advanced",
  intermediate: "Intermediate",
  beginner: "Beginner",
};

function getTier(score: number): string {
  if (score >= 85) return "expert";
  if (score >= 65) return "advanced";
  if (score >= 40) return "intermediate";
  return "beginner";
}

export const SkillGraph: React.FC<SkillGraphProps> = ({
  skills,
  title = "Skill Graph",
  mode = "bars",
}) => {
  const skillEntries = useMemo(
    () => Object.entries(skills).sort((a, b) => b[1] - a[1]),
    [skills]
  );

  const radarData = useMemo(
    () => skillEntries.map(([name, value]) => ({ subject: name, score: value, fullMark: 100 })),
    [skillEntries]
  );

  const avgScore = useMemo(() => {
    if (!skillEntries.length) return 0;
    return Math.round(skillEntries.reduce((acc, [, v]) => acc + v, 0) / skillEntries.length);
  }, [skillEntries]);

  const overallTier = getTier(avgScore);

  if (!skillEntries.length) {
    return (
      <div className="glass-card p-6 text-center text-gray-500 text-sm">
        No skill data yet. Complete tests and challenges to build your skill graph.
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-400" />
          <span className={`text-xs font-black uppercase tracking-widest bg-gradient-to-r ${TIER_COLORS[overallTier]} bg-clip-text text-transparent`}>
            {TIER_LABELS[overallTier]}
          </span>
          <span className="text-gray-500 text-xs">({avgScore}% avg)</span>
        </div>
      </div>

      {mode === "radar" && radarData.length >= 3 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius={90}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 600 }}
              />
              <Radar
                name="Skills"
                dataKey="score"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                itemStyle={{ color: "#e2e8f0" }}
                formatter={(val: number) => [`${val}%`, "Score"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-3">
          {skillEntries.map(([skill, score]) => {
            const tier = getTier(score);
            return (
              <div key={skill} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-300 uppercase tracking-wider">{skill}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${TIER_COLORS[tier]} bg-opacity-10 text-white`}>
                      {TIER_LABELS[tier]}
                    </span>
                    <span className="text-indigo-400 font-mono">{score}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${TIER_COLORS[tier]} transition-all duration-700`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
        {Object.entries(TIER_COLORS).map(([tier, gradient]) => (
          <div key={tier} className="flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${gradient}`} />
            <span>{TIER_LABELS[tier]}</span>
            <span className="text-gray-600">
              {tier === "expert" ? "85-100%" : tier === "advanced" ? "65-84%" : tier === "intermediate" ? "40-64%" : "0-39%"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-600">
        <TrendingUp className="w-3 h-3" />
        Updated after each test and challenge submission
      </div>
    </div>
  );
};

export default SkillGraph;
