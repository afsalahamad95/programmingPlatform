import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Zap, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { studentApi } from '../services/api';

const STUDENT_ID = 'demo';

interface SkillEntry {
  skill: string;
  score: number;
  level: string;
}

interface SkillData {
  skillRadar: SkillEntry[];
  topSkills: SkillEntry[];
  weakSkills: SkillEntry[];
  skillFrequency: { skill: string; count: number }[];
  programmingLanguages: string[];
  frameworks: string[];
  tools: string[];
  totalSkillsTracked: number;
}

const levelColors: Record<string, string> = {
  Expert:     'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Proficient: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Developing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Beginner:   'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

const barColor = (score: number) => {
  if (score >= 80) return 'from-yellow-500 to-amber-400';
  if (score >= 60) return 'from-emerald-500 to-green-400';
  if (score >= 40) return 'from-blue-500 to-indigo-400';
  return 'from-gray-500 to-gray-400';
};

const CATEGORIES = ['Languages', 'Frameworks', 'Tools'] as const;

export default function SkillGraph() {
  const [data, setData] = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'frequency'>('score');
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    studentApi.getSkillAnalytics(STUDENT_ID).then((res) => {
      setData(res as SkillData);
      setLoading(false);
    });
  }, []);

  const allSkills: SkillEntry[] = data?.skillRadar ?? [];
  const freqMap: Record<string, number> = Object.fromEntries(
    (data?.skillFrequency ?? []).map(({ skill, count }) => [skill, count])
  );

  const filtered = allSkills
    .filter(s => s.skill.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'score')     cmp = a.score - b.score;
      else if (sortBy === 'name') cmp = a.skill.localeCompare(b.skill);
      else                        cmp = (freqMap[a.skill] ?? 0) - (freqMap[b.skill] ?? 0);
      return sortDesc ? -cmp : cmp;
    });

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortDesc(v => !v);
    else { setSortBy(key); setSortDesc(true); }
  };

  const SortBtn = ({ label, key }: { label: string; key: typeof sortBy }) => (
    <button
      onClick={() => toggleSort(key)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        sortBy === key
          ? 'bg-indigo-600 text-white'
          : 'bg-white/5 text-gray-400 hover:text-gray-200 border border-white/10'
      }`}
    >
      {label}
      {sortBy === key && (sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-sm animate-pulse">
        Loading skill graph…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
              Skill Graph
            </h1>
            <p className="text-sm text-gray-400 mt-1">{data?.totalSkillsTracked ?? 0} skills tracked from activity</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Filter skills…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-lg text-sm text-gray-200 placeholder-gray-600 w-40"
            />
            <SortBtn label="Score" key="score" />
            <SortBtn label="Name" key="name" />
            <SortBtn label="Usage" key="frequency" />
          </div>
        </div>
      </div>

      {/* ── Top / Weak summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" /> Strongest Skills
          </h2>
          <div className="space-y-2.5">
            {(data?.topSkills ?? []).slice(0, 5).map(s => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-sm text-gray-200 w-32 truncate">{s.skill}</span>
                <div className="flex-1 bg-gray-700/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${barColor(s.score)}`}
                    style={{ width: `${s.score}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-400 w-8 text-right">{s.score}%</span>
              </div>
            ))}
            {!(data?.topSkills?.length) && <p className="text-gray-600 text-xs">No data yet</p>}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-rose-400 flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" /> Focus Areas
          </h2>
          <div className="space-y-2.5">
            {(data?.weakSkills ?? []).slice(0, 5).map(s => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-sm text-gray-200 w-32 truncate">{s.skill}</span>
                <div className="flex-1 bg-gray-700/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-400`}
                    style={{ width: `${Math.max(s.score, 4)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-400 w-8 text-right">{s.score}%</span>
              </div>
            ))}
            {!(data?.weakSkills?.length) && <p className="text-gray-600 text-xs">No data yet</p>}
          </div>
        </div>
      </div>

      {/* ── Full Skill List ── */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">All Tracked Skills ({filtered.length})</h2>
        </div>
        {filtered.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filtered.map(s => (
              <div key={s.skill} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors group">
                <span className="text-sm text-gray-200 w-36 truncate font-medium group-hover:text-white transition-colors">{s.skill}</span>
                <div className="flex-1 bg-gray-700/40 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full bg-gradient-to-r ${barColor(s.score)} transition-all duration-500`}
                    style={{ width: `${Math.max(s.score, 2)}%` }}
                  />
                </div>
                <span className="font-mono text-sm font-bold text-white w-10 text-right">{s.score}%</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border w-24 text-center ${levelColors[s.level] ?? levelColors.Beginner}`}>
                  {s.level}
                </span>
                {freqMap[s.skill] ? (
                  <span className="text-[10px] text-gray-600 font-mono w-16 text-right hidden sm:block">
                    {freqMap[s.skill]}× used
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <BarChart2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {filter ? `No skills matching "${filter}"` : 'No skill data yet. Complete tests to build your graph.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Tech Stack Categories ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => {
          const items =
            cat === 'Languages' ? data?.programmingLanguages
            : cat === 'Frameworks' ? data?.frameworks
            : data?.tools ?? [];
          return (
            <div key={cat} className="glass-card p-5">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-indigo-400" /> {cat}
              </h2>
              <div className="flex flex-wrap gap-2">
                {(items ?? []).map(item => (
                  <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    {item}
                  </span>
                ))}
                {!(items?.length) && <span className="text-xs text-gray-600">None added yet</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
