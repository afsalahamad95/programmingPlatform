import React, { useState } from "react";
import { useQuery } from "react-query";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api";
import { Link } from "react-router-dom";
import {
  Trophy, Star, Zap, Target, Award, Clock, TrendingUp,
  Lock, Download, Share2, ArrowLeft, CheckCircle2
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Badge {
  id: string;
  studentId: string;
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  category: "milestone" | "performance" | "speed" | "consistency" | "specialty";
  earnedAt: string;
  testTitle?: string;
  score?: number;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  category: string;
}

interface CertificateData {
  studentName: string;
  studentEmail: string;
  testTitle: string;
  score: number;
  grade: string;
  completedAt: string;
  certId: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  bronze:   { label: "Bronze",   ring: "ring-amber-700/60",  bg: "bg-amber-900/20",   text: "text-amber-500",  glow: "shadow-[0_0_20px_rgba(180,83,9,0.35)]",  bar: "bg-amber-600" },
  silver:   { label: "Silver",   ring: "ring-gray-400/60",   bg: "bg-gray-700/20",    text: "text-gray-300",   glow: "shadow-[0_0_20px_rgba(209,213,219,0.3)]", bar: "bg-gray-400" },
  gold:     { label: "Gold",     ring: "ring-yellow-400/70", bg: "bg-yellow-900/20",  text: "text-yellow-400", glow: "shadow-[0_0_25px_rgba(250,204,21,0.4)]",  bar: "bg-yellow-400" },
  platinum: { label: "Platinum", ring: "ring-cyan-400/70",   bg: "bg-cyan-900/20",    text: "text-cyan-300",   glow: "shadow-[0_0_30px_rgba(103,232,249,0.45)]",bar: "bg-cyan-400" },
} as const;

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  milestone:   { icon: Trophy,     label: "Milestone",   color: "text-indigo-400" },
  performance: { icon: Star,       label: "Performance", color: "text-yellow-400" },
  speed:       { icon: Zap,        label: "Speed",       color: "text-blue-400"   },
  consistency: { icon: TrendingUp, label: "Consistency", color: "text-emerald-400"},
  specialty:   { icon: Award,      label: "Specialty",   color: "text-purple-400" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const BadgeCard: React.FC<{
  def: BadgeDefinition;
  earned?: Badge;
  onViewCert?: () => void;
}> = ({ def, earned, onViewCert }) => {
  const tier = TIER_CONFIG[earned?.tier ?? def.tier];
  const cat  = CATEGORY_CONFIG[def.category] ?? CATEGORY_CONFIG.specialty;
  const CatIcon = cat.icon;
  const isEarned = !!earned;

  return (
    <div className={`relative rounded-3xl border overflow-hidden transition-all duration-300 group
      ${isEarned
        ? `ring-2 ${tier.ring} ${tier.bg} border-white/15 hover:scale-[1.03] cursor-default ${tier.glow}`
        : "border-white/8 bg-white/[0.02] opacity-50 hover:opacity-70"
      }`}>
      {/* Earned glow overlay */}
      {isEarned && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}

      <div className="p-6 flex flex-col items-center text-center gap-3 relative">
        {/* Icon */}
        <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
          ${isEarned ? `${tier.bg} ring-2 ${tier.ring}` : "bg-white/5 ring-1 ring-white/10"}`}>
          {isEarned ? def.icon : <Lock className="w-6 h-6 text-gray-600" />}
          {isEarned && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Tier badge */}
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border
          ${isEarned ? `${tier.text} border-current/30 bg-current/10` : "text-gray-600 border-gray-700 bg-white/5"}`}>
          {tier.label}
        </span>

        {/* Name */}
        <h3 className={`font-bold text-sm leading-tight ${isEarned ? "text-white" : "text-gray-500"}`}>
          {def.name}
        </h3>

        {/* Description */}
        <p className={`text-xs leading-relaxed ${isEarned ? "text-gray-400" : "text-gray-600"}`}>
          {def.description}
        </p>

        {/* Category pill */}
        <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isEarned ? cat.color : "text-gray-600"}`}>
          <CatIcon className="w-3 h-3" />
          {cat.label}
        </div>

        {/* Earned meta */}
        {isEarned && earned && (
          <div className="w-full pt-3 border-t border-white/10 space-y-1.5">
            <p className="text-[10px] text-gray-500">
              {new Date(earned.earnedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
            {earned.testTitle && (
              <p className="text-[10px] text-gray-600 truncate">via {earned.testTitle}</p>
            )}
            {earned.score !== undefined && (
              <p className={`text-[10px] font-bold ${tier.text}`}>{earned.score.toFixed(1)}% score</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CertificateModal: React.FC<{
  cert: CertificateData;
  onClose: () => void;
}> = ({ cert, onClose }) => {
  const gradeColor =
    cert.grade === "A" ? "#10b981" :
    cert.grade === "B" ? "#34d399" :
    cert.grade === "C" ? "#f59e0b" : "#6366f1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}>
      <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        {/* Certificate */}
        <div id="certificate-print"
          className="relative rounded-3xl overflow-hidden border-2 border-yellow-500/40 bg-[#0a1220] shadow-[0_0_60px_rgba(250,204,21,0.2)] p-10">
          {/* Corner ornaments */}
          <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-yellow-500/40 rounded-tl-xl" />
          <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-yellow-500/40 rounded-tr-xl" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-yellow-500/40 rounded-bl-xl" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-yellow-500/40 rounded-br-xl" />

          {/* Background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.05),transparent_70%)]" />

          <div className="relative text-center space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-500/40" />
                <Trophy className="w-5 h-5 text-yellow-400" />
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-500/40" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/70">
                Certificate of Achievement
              </p>
            </div>

            {/* Platform name */}
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Programming Platform
            </p>

            {/* "This certifies" */}
            <div className="space-y-1">
              <p className="text-sm text-gray-400">This certifies that</p>
              <h2 className="text-4xl font-black text-white tracking-tight">{cert.studentName}</h2>
              <p className="text-sm text-gray-400">has successfully completed</p>
            </div>

            {/* Test title */}
            <div className="py-4 px-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
              <h3 className="text-2xl font-bold text-yellow-300">{cert.testTitle}</h3>
            </div>

            {/* Score ring */}
            <div className="flex items-center justify-center gap-12">
              <div className="text-center">
                <div className="text-4xl font-black" style={{ color: gradeColor }}>{cert.grade}</div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Grade</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-white">{cert.score.toFixed(1)}%</div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Score</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-300">
                  {new Date(cert.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Completed</p>
              </div>
            </div>

            {/* Cert ID */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em] font-mono">{cert.certId}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 px-2">
          <button onClick={onClose} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Close
          </button>
          <div className="flex gap-3">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-300 transition-all">
              <Download className="w-4 h-4" /> Print / Save
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: `Certificate — ${cert.testTitle}`, text: `I earned a certificate for ${cert.testTitle} with ${cert.score.toFixed(1)}%!` });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-sm text-indigo-300 transition-all">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const BadgesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCert, setActiveCert] = useState<CertificateData | null>(null);

  const studentId = (user as any)?.id ?? (user as any)?.studentId ?? "";

  const { data: earned = [], isLoading: loadingBadges } = useQuery<Badge[]>(
    ["badges", studentId],
    async () => {
      if (!studentId) return [];
      const res = await api.get(`/badges/student/${studentId}`);
      return res.data ?? [];
    },
    { enabled: !!studentId }
  );

  const { data: definitions = [], isLoading: loadingDefs } = useQuery<BadgeDefinition[]>(
    "badgeDefinitions",
    async () => {
      const res = await api.get("/badges/definitions");
      return res.data ?? [];
    }
  );

  const earnedMap = React.useMemo(() => {
    const m: Record<string, Badge> = {};
    earned.forEach(b => { m[b.badgeId] = b; });
    return m;
  }, [earned]);

  const categories = ["all", "milestone", "performance", "consistency", "speed"];

  const filteredDefs = activeFilter === "all"
    ? definitions
    : definitions.filter(d => d.category === activeFilter);

  const earnedCount  = definitions.filter(d => earnedMap[d.id]).length;
  const totalCount   = definitions.length;
  const progressPct  = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 } as Record<string, number>;
  earned.forEach(b => { if (tierCounts[b.tier] !== undefined) tierCounts[b.tier]++; });

  if (loadingBadges || loadingDefs) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-t-indigo-500 border-white/10 animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">Loading your achievements…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 space-y-10 text-gray-100">
      {/* ── Header ── */}
      <div className="relative rounded-[2.5rem] overflow-hidden p-10 bg-black/40 border border-white/10 backdrop-blur-3xl">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h1 className="text-4xl font-black text-white">Achievements</h1>
            </div>
            <p className="text-gray-400 max-w-md">
              Earn badges by completing assessments, hitting milestones, and mastering topics.
              Every badge unlocks a certificate.
            </p>
          </div>

          {/* Tier summary */}
          <div className="flex gap-4">
            {Object.entries(tierCounts).map(([tier, count]) => {
              const t = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
              return (
                <div key={tier} className={`flex flex-col items-center p-3 rounded-2xl border ${count > 0 ? `${t.bg} ring-1 ${t.ring}` : "bg-white/5 border-white/8 opacity-40"}`}>
                  <span className={`text-2xl font-black ${count > 0 ? t.text : "text-gray-600"}`}>{count}</span>
                  <span className={`text-[9px] uppercase tracking-wider ${count > 0 ? t.text : "text-gray-600"}`}>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400">Collection Progress</span>
            <span className="text-xs font-bold text-white">{earnedCount} / {totalCount} badges</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Recently earned ── */}
      {earned.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Recently Earned
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {[...earned].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()).slice(0, 5).map(b => {
              const t = TIER_CONFIG[b.tier];
              return (
                <div key={b.id} className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border ${t.bg} ring-1 ${t.ring} ${t.glow}`}>
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{b.name}</p>
                    <p className={`text-[10px] font-bold ${t.text}`}>{t.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Category filter ── */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => {
          const cfg = cat === "all" ? null : CATEGORY_CONFIG[cat];
          const CatIcon = cfg?.icon;
          return (
            <button key={cat} onClick={() => setActiveFilter(cat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                activeFilter === cat
                  ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
              }`}>
              {CatIcon && <CatIcon className={`w-3.5 h-3.5 ${activeFilter === cat ? "text-indigo-400" : "text-gray-500"}`} />}
              {cat === "all" ? "All Badges" : cfg?.label ?? cat}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeFilter === cat ? "bg-indigo-500/20 text-indigo-300" : "bg-white/10 text-gray-500"}`}>
                {cat === "all" ? definitions.length : definitions.filter(d => d.category === cat).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Badge grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredDefs.map(def => (
          <BadgeCard
            key={def.id}
            def={def}
            earned={earnedMap[def.id]}
          />
        ))}
      </div>

      {filteredDefs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-3">
          <Trophy className="w-12 h-12 opacity-20" />
          <p className="text-sm">No badges in this category yet.</p>
        </div>
      )}

      {/* ── Certificates section ── */}
      {earned.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" /> Certificates
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Each badge you earn comes with a shareable certificate. Click a test result to generate yours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {earned.filter(b => b.testTitle && b.score !== undefined).map(b => {
              const t = TIER_CONFIG[b.tier];
              const grade = (b.score ?? 0) >= 90 ? "A" : (b.score ?? 0) >= 80 ? "B" : (b.score ?? 0) >= 70 ? "C" : (b.score ?? 0) >= 60 ? "D" : "F";
              return (
                <button key={b.id}
                  onClick={() => setActiveCert({
                    studentName:  user?.fullName ?? "Student",
                    studentEmail: (user as any)?.email ?? "",
                    testTitle:    b.testTitle!,
                    score:        b.score!,
                    grade,
                    completedAt:  b.earnedAt,
                    certId:       `CERT-${b.badgeId.toUpperCase()}-${b.studentId.slice(-6).toUpperCase()}`,
                  })}
                  className={`text-left p-5 rounded-2xl border ${t.bg} ring-1 ${t.ring} hover:scale-[1.02] transition-all group`}>
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{b.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{b.testTitle}</p>
                      <p className={`text-xs font-bold ${t.text} mt-0.5`}>{b.score?.toFixed(1)}% · Grade {grade}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(b.earnedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Award className="w-5 h-5 text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Back link ── */}
      <div className="flex justify-center pb-8">
        <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      {/* ── Certificate modal ── */}
      {activeCert && (
        <CertificateModal cert={activeCert} onClose={() => setActiveCert(null)} />
      )}
    </div>
  );
};

export default BadgesPage;
