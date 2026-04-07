import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Code, Award, Users, BookOpen, TrendingUp,
  Flame, Clock, Target, Star, ChevronRight, Zap,
  BrainCircuit, BarChart2, Activity, Layers,
} from 'lucide-react';
import { studentApi } from '../services/api';
import type { Student } from '../types/student';

// ─── Mock student ID — replace with auth context ────────────────────────────
const STUDENT_ID = 'demo';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface InsightData {
  insight: string;
  insightType: 'positive' | 'constructive' | 'neutral';
  prioritySkill: string;
  strongestSkill: string | null;
  streak: number;
  totalTimeSpent: number;
  recentFailures: number;
}

interface MilestoneData {
  milestoneName: string;
  targetPoints: number;
  currentPoints: number;
  pointsRemaining: number;
  daysRemaining: number | string;
  probabilityOfSuccess: number;
  allMilestones: { name: string; target: number; achieved: boolean; progress: number }[];
}

interface SkillAnalytics {
  skillRadar: { skill: string; score: number; level: string }[];
  topSkills: { skill: string; score: number }[];
  weakSkills: { skill: string; score: number }[];
  programmingLanguages: string[];
  frameworks: string[];
  tools: string[];
}

interface HeatmapData {
  heatmap: { date: string; count: number }[];
  weeklyDistribution: { day: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  totalActivities: number;
  activeDays: number;
}

interface TimelineData {
  timeline: { date: string; avgScore: number; attempts: number; cumulativePoints: number; rollingAvgScore: number }[];
  totalTests: number;
  overallAvgScore: number;
  currentPoints: number;
  streak: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const heatmapColor = (count: number, max: number) => {
  if (count === 0) return 'bg-white/5';
  const intensity = count / Math.max(max, 1);
  if (intensity < 0.25) return 'bg-indigo-500/20';
  if (intensity < 0.5) return 'bg-indigo-500/40';
  if (intensity < 0.75) return 'bg-indigo-500/70';
  return 'bg-indigo-500';
};

const insightBg = (type: string) => {
  if (type === 'positive') return 'border-emerald-500/30 bg-emerald-500/5';
  if (type === 'constructive') return 'border-amber-500/30 bg-amber-500/5';
  return 'border-indigo-500/30 bg-indigo-500/5';
};

const insightIcon = (type: string) => {
  if (type === 'positive') return 'text-emerald-400';
  if (type === 'constructive') return 'text-amber-400';
  return 'text-indigo-400';
};

const levelColor = (level: string) => {
  if (level === 'Expert') return 'text-yellow-400';
  if (level === 'Proficient') return 'text-emerald-400';
  if (level === 'Developing') return 'text-blue-400';
  return 'text-gray-400';
};

// ─── Small Components ────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) => (
  <div className="glass-card p-5 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 truncate">{label}</p>
      <p className="text-xl font-bold text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Mini Sparkline (CSS only) ────────────────────────────────────────────────

const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-indigo-500/50 transition-all"
          style={{ height: `${(v / max) * 100}%`, minHeight: 2 }}
        />
      ))}
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [milestone, setMilestone] = useState<MilestoneData | null>(null);
  const [skillAnalytics, setSkillAnalytics] = useState<SkillAnalytics | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, ins, mil, skills, heat, tl] = await Promise.allSettled([
        studentApi.getStudent(STUDENT_ID),
        studentApi.getInsights(STUDENT_ID),
        studentApi.getMilestones(STUDENT_ID),
        studentApi.getSkillAnalytics(STUDENT_ID),
        studentApi.getActivityHeatmap(STUDENT_ID),
        studentApi.getPerformanceTimeline(STUDENT_ID),
      ]);
      if (s.status === 'fulfilled') setStudent(s.value as Student);
      if (ins.status === 'fulfilled' && ins.value) setInsight(ins.value as InsightData);
      if (mil.status === 'fulfilled' && mil.value) setMilestone(mil.value as MilestoneData);
      if (skills.status === 'fulfilled' && skills.value) setSkillAnalytics(skills.value as SkillAnalytics);
      if (heat.status === 'fulfilled' && heat.value) setHeatmap(heat.value as HeatmapData);
      if (tl.status === 'fulfilled' && tl.value) setTimeline(tl.value as TimelineData);
      setLoading(false);
    };
    load();
  }, []);

  const name = student?.basicInfo?.name ?? 'Learner';
  const branch = student?.basicInfo?.branch ?? '—';
  const semester = student?.basicInfo?.currentSemester ?? '—';
  const points = student?.basicInfo?.points ?? 0;

  const projects = student?.projects?.length ?? 0;
  const achievements = student?.achievements?.length ?? 0;
  const certifications = student?.certifications?.length ?? 0;

  // Build heatmap grid — last 12 weeks (84 days)
  const today = new Date();
  const heatmapGrid = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (83 - i));
    const key = d.toISOString().split('T')[0];
    const entry = heatmap?.heatmap?.find(h => h.date === key);
    return { date: key, count: entry?.count ?? 0 };
  });
  const maxActivity = Math.max(...heatmapGrid.map(h => h.count), 1);

  // Timeline sparkline data (last 14 days)
  const sparkData = (timeline?.timeline ?? []).slice(-14).map(t => t.avgScore);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
          <BrainCircuit className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 animate-pulse" />
        </div>
        <p className="text-gray-400 text-sm font-mono">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Profile Header ── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome back, {name.split(' ')[0]}!</h2>
              <p className="text-gray-400 text-sm">{branch} • Semester {semester}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 font-bold text-sm">{insight?.streak ?? 0} day streak</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-bold text-sm">{points.toLocaleString()} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Code} label="Projects" value={projects} color="bg-indigo-500/20 text-indigo-400 border border-indigo-500/20" />
        <StatCard icon={Trophy} label="Achievements" value={achievements} color="bg-yellow-500/20 text-yellow-400 border border-yellow-500/20" />
        <StatCard icon={Award} label="Certifications" value={certifications} color="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" />
        <StatCard icon={Users} label="Avg. Score" value={`${timeline?.overallAvgScore ?? 0}%`} sub={`${timeline?.totalTests ?? 0} tests taken`} color="bg-purple-500/20 text-purple-400 border border-purple-500/20" />
      </div>

      {/* ── AI Coaching Insight ── */}
      {insight && (
        <div className={`glass-card p-5 border rounded-xl ${insightBg(insight.insightType)}`}>
          <div className="flex items-start gap-3">
            <BrainCircuit className={`w-5 h-5 mt-0.5 flex-shrink-0 ${insightIcon(insight.insightType)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">AI Coach</p>
              <p className="text-gray-200 text-sm leading-relaxed">{insight.insight}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="text-xs text-gray-400">
                  Focus: <span className="text-indigo-300 font-medium">{insight.prioritySkill}</span>
                </span>
                {insight.strongestSkill && (
                  <span className="text-xs text-gray-400">
                    Strength: <span className="text-emerald-300 font-medium">{insight.strongestSkill}</span>
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  Time: <span className="text-gray-300 font-medium">{Math.floor((insight.totalTimeSpent ?? 0) / 60)}h</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2-column: Progress + Milestones ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400" /> Performance Trend</h3>
            <span className="text-xs text-gray-500 font-mono">Last 14 days</span>
          </div>
          {sparkData.length > 0 ? (
            <Sparkline data={sparkData} />
          ) : (
            <div className="h-10 flex items-center justify-center text-gray-600 text-xs">No test data yet</div>
          )}
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span>Avg: <span className="text-gray-300 font-medium">{timeline?.overallAvgScore ?? 0}%</span></span>
            <span>Tests: <span className="text-gray-300 font-medium">{timeline?.totalTests ?? 0}</span></span>
            <span>Points: <span className="text-yellow-400 font-medium">{timeline?.currentPoints?.toLocaleString() ?? 0}</span></span>
          </div>
        </div>

        {/* Milestone Progress */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" /> Milestones</h3>
            {milestone && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                {milestone.probabilityOfSuccess}% likely
              </span>
            )}
          </div>
          <div className="space-y-3">
            {(milestone?.allMilestones ?? []).map((m) => (
              <div key={m.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${m.achieved ? 'text-emerald-400' : 'text-gray-300'}`}>{m.name}</span>
                  <span className="text-gray-500 font-mono">{m.progress}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${m.achieved ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {!milestone && <p className="text-gray-600 text-xs text-center py-4">No milestone data yet</p>}
          </div>
          {milestone && (
            <p className="text-xs text-gray-500 mt-3 font-mono">
              Next: <span className="text-gray-300">{milestone.milestoneName}</span> — {milestone.daysRemaining} days
            </p>
          )}
        </div>
      </div>

      {/* ── Skill Radar (CSS bars) ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-400" /> Skill Progression</h3>
          <Link to="/profile" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
            Edit skills <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {(skillAnalytics?.skillRadar?.length ?? 0) > 0 ? (
          <div className="space-y-3">
            {(skillAnalytics?.skillRadar ?? []).slice(0, 8).map((s) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 w-28 truncate">{s.skill}</span>
                <div className="flex-1 bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, s.score)}%` }}
                  />
                </div>
                <span className={`text-xs font-mono w-14 text-right ${levelColor(s.level)}`}>{s.level}</span>
                <span className="text-xs font-mono text-gray-500 w-10 text-right">{s.score}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-600 text-xs text-center py-2">No skill data tracked yet</p>
            {/* Show tech stack from profile */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[...(skillAnalytics?.programmingLanguages ?? []), ...(skillAnalytics?.frameworks ?? [])].slice(0, 10).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Activity Heatmap ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /> Activity</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{heatmap?.activeDays ?? 0} active days</span>
            <span>{heatmap?.totalActivities ?? 0} total actions</span>
          </div>
        </div>
        {/* 12-week grid */}
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {/* Build 7-row × 12-col grid by grouping by week */}
          {Array.from({ length: 12 }, (_, week) =>
            Array.from({ length: 7 }, (_, day) => {
              const idx = week * 7 + day;
              const cell = heatmapGrid[idx];
              return (
                <div
                  key={`${week}-${day}`}
                  title={cell ? `${cell.date}: ${cell.count} actions` : ''}
                  className={`w-full aspect-square rounded-sm ${heatmapColor(cell?.count ?? 0, maxActivity)} cursor-default`}
                />
              );
            })
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-gray-600">Less</span>
          {['bg-white/5', 'bg-indigo-500/20', 'bg-indigo-500/40', 'bg-indigo-500/70', 'bg-indigo-500'].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-[10px] text-gray-600">More</span>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/resume', icon: Layers, label: 'Resume Builder', color: 'text-indigo-400' },
          { to: '/roadmap', icon: Zap, label: 'Career Roadmap', color: 'text-yellow-400' },
          { to: '/interview-prep', icon: Users, label: 'Interview Prep', color: 'text-purple-400' },
          { to: '/certifications', icon: BookOpen, label: 'Certifications', color: 'text-emerald-400' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to} className="glass-card p-4 flex flex-col items-center gap-2 hover:-translate-y-0.5 hover:border-white/10 transition-all group">
            <Icon className={`w-6 h-6 ${color} group-hover:scale-110 transition-transform`} />
            <span className="text-xs text-gray-300 text-center font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
