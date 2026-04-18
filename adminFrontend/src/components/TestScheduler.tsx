import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, ArrowLeft, Wand2, Sparkles, Loader2, X, Search, Check,
  ChevronRight, ChevronLeft, Eye, EyeOff, Clock, Users, BookOpen,
  BarChart3, Settings2, Zap, GripVertical, Plus, Minus, Target,
  AlertCircle, CheckCircle2, ListChecks, Trophy, Filter, Code2,
  FileText, Brain, LayoutGrid, Star
} from 'lucide-react';
import { Question, Student } from '../types';
import { chatApi } from '../api/chatApi';

interface TestSchedulerProps {
  onSchedule: (data: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    questions: Question[];
    allowedStudents: Student[];
  }) => void;
  onBack: () => void;
  questions: Question[];
  students?: Student[];
}

type Step = 'config' | 'questions' | 'students' | 'review';

const STEPS: { id: Step; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'config',    label: 'Configure',  icon: Settings2,   desc: 'Test settings' },
  { id: 'questions', label: 'Questions',  icon: BookOpen,    desc: 'Select content' },
  { id: 'students',  label: 'Students',   icon: Users,       desc: 'Assign access' },
  { id: 'review',    label: 'Review',     icon: CheckCircle2, desc: 'Publish' },
];

const TYPE_META: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  mcq:       { color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30', icon: ListChecks, label: 'MCQ' },
  coding:    { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: Code2, label: 'Coding' },
  subjective:{ color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', icon: FileText, label: 'Subjective' },
};

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  { value: 'intermediate', label: 'Intermediate', color: 'text-amber-400', dot: 'bg-amber-400' },
  { value: 'advanced', label: 'Advanced', color: 'text-rose-400', dot: 'bg-rose-400' },
  { value: 'mixed', label: 'Mixed', color: 'text-indigo-400', dot: 'bg-indigo-400' },
];

// ── Drag state (lightweight, no library needed for basic reorder) ─────────────
let _dragIndex: number | null = null;

export default function TestScheduler({ onSchedule, onBack, questions, students = [] }: TestSchedulerProps) {
  // ── Step tracking ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<Step>('config');

  // ── Step 1: Config ─────────────────────────────────────────────────────────
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate]   = useState('');
  const [startTime, setStartTime]   = useState('');
  const [duration, setDuration]     = useState(60);
  const [difficulty, setDifficulty] = useState('mixed');
  const [passThreshold, setPassThreshold] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // ── Step 2: Questions ──────────────────────────────────────────────────────
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [qSearch, setQSearch]       = useState('');
  const [qTypeFilter, setQTypeFilter] = useState('all');
  const [qSubjectFilter, setQSubjectFilter] = useState('all');
  const [previewQ, setPreviewQ]     = useState<Question | null>(null);
  const [dragOver, setDragOver]     = useState<number | null>(null);

  // ── Step 3: Students ───────────────────────────────────────────────────────
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [sSearch, setSSearch]       = useState('');
  const [sDeptFilter, setSDeptFilter] = useState('all');
  const [openAccess, setOpenAccess] = useState(false);

  // ── AI Modal ───────────────────────────────────────────────────────────────
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt]     = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError]       = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const totalPoints = selectedQuestions.reduce((s, q) => s + q.points, 0);

  const qSubjects = useMemo(() => {
    const s = new Set(questions.map(q => q.subject).filter(Boolean));
    return ['all', ...Array.from(s)];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const ms = q.content.toLowerCase().includes(qSearch.toLowerCase()) ||
                 q.subject?.toLowerCase().includes(qSearch.toLowerCase());
      const mt = qTypeFilter === 'all' || q.type === qTypeFilter;
      const msub = qSubjectFilter === 'all' || q.subject === qSubjectFilter;
      return ms && mt && msub;
    });
  }, [questions, qSearch, qTypeFilter, qSubjectFilter]);

  const departments = useMemo(() => {
    const d = new Set(students.map(s => s.department).filter(Boolean));
    return ['all', ...Array.from(d)];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const ms = s.fullName.toLowerCase().includes(sSearch.toLowerCase()) ||
                 s.email.toLowerCase().includes(sSearch.toLowerCase());
      const md = sDeptFilter === 'all' || s.department === sDeptFilter;
      return ms && md;
    });
  }, [students, sSearch, sDeptFilter]);

  const typeBreakdown = useMemo(() => {
    const t: Record<string, number> = {};
    selectedQuestions.forEach(q => { t[q.type] = (t[q.type] || 0) + 1; });
    return t;
  }, [selectedQuestions]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleQuestion = (q: Question) => {
    setSelectedQuestions(prev =>
      prev.some(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, q]
    );
  };

  const removeSelected = (id: string) =>
    setSelectedQuestions(prev => prev.filter(q => q.id !== id));

  const toggleStudent = (s: Student) => {
    setSelectedStudents(prev =>
      prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]
    );
  };

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  const canProceed = (): boolean => {
    if (currentStep === 'config')    return !!(title && description && startDate && startTime && duration > 0);
    if (currentStep === 'questions') return selectedQuestions.length > 0;
    if (currentStep === 'students')  return openAccess || selectedStudents.length > 0;
    return true;
  };

  const goNext = () => {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].id);
  };
  const goPrev = () => {
    const idx = stepIndex;
    if (idx > 0) setCurrentStep(STEPS[idx - 1].id);
  };

  const handlePublish = () => {
    const start = new Date(`${startDate}T${startTime}`);
    const end   = new Date(start.getTime() + duration * 60000);
    onSchedule({
      title, description, startTime: start, endTime: end, duration,
      questions: selectedQuestions,
      allowedStudents: openAccess ? [] : selectedStudents,
    });
  };

  // ── AI Generation ──────────────────────────────────────────────────────────
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true); setAiError(null);
    try {
      const slim = questions.map(q => ({ id: q.id, title: q.content, topic: q.subject, type: q.type }));
      const res = await chatApi.autoSchedule(aiPrompt, slim);
      if (res.title)       setTitle(res.title);
      if (res.description) setDescription(res.description);
      if (res.duration)    setDuration(res.duration);
      if (Array.isArray(res.selected_question_ids)) {
        setSelectedQuestions(questions.filter(q => res.selected_question_ids.includes(q.id)));
      }
      setShowAiModal(false); setAiPrompt('');
      setCurrentStep('questions');
    } catch (e: any) {
      setAiError(e.message || 'AI generation failed.');
    } finally { setIsGenerating(false); }
  };

  // ── Drag-to-reorder selected questions ────────────────────────────────────
  const handleDragStart = (idx: number) => { _dragIndex = idx; };
  const handleDragEnterRow = (idx: number) => setDragOver(idx);
  const handleDrop = (targetIdx: number) => {
    if (_dragIndex === null || _dragIndex === targetIdx) { setDragOver(null); return; }
    const reordered = [...selectedQuestions];
    const [moved] = reordered.splice(_dragIndex, 1);
    reordered.splice(targetIdx, 0, moved);
    setSelectedQuestions(reordered);
    _dragIndex = null; setDragOver(null);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderConfig = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Title + Description */}
      <div className="grid grid-cols-1 gap-5">
        <div className="glass-field">
          <label className="field-label">Test Title <span className="text-rose-400">*</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Midterm — Data Structures & Algorithms"
            className="field-input"
          />
        </div>
        <div className="glass-field">
          <label className="field-label">Description <span className="text-rose-400">*</span></label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief overview visible to students before they begin…"
            className="field-input resize-none"
          />
        </div>
      </div>

      {/* Time Window */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Time Window
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-field col-span-1">
            <label className="field-label">Date <span className="text-rose-400">*</span></label>
            <input type="date" value={startDate} min={today}
              onChange={e => setStartDate(e.target.value)}
              className="field-input [color-scheme:dark]" />
          </div>
          <div className="glass-field">
            <label className="field-label">Start Time <span className="text-rose-400">*</span></label>
            <input type="time" value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="field-input [color-scheme:dark]" />
          </div>
          <div className="glass-field">
            <label className="field-label">Duration (min) <span className="text-rose-400">*</span></label>
            <input type="number" min={1} value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="field-input" />
          </div>
        </div>
        {startDate && startTime && (
          <p className="mt-3 text-xs text-indigo-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Ends at {new Date(new Date(`${startDate}T${startTime}`).getTime() + duration * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {new Date(`${startDate}T${startTime}`).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Assessment Settings
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Difficulty */}
          <div>
            <label className="field-label mb-3">Difficulty Level</label>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTY_OPTIONS.map(d => (
                <button key={d.value} type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    difficulty === d.value
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${d.dot}`} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pass Threshold */}
          <div>
            <label className="field-label mb-3">Pass Threshold</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} step={5} value={passThreshold}
                onChange={e => setPassThreshold(Number(e.target.value))}
                className="flex-1 accent-indigo-500" />
              <div className={`w-14 text-center py-1.5 rounded-lg font-bold text-sm border ${
                passThreshold >= 70 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : passThreshold >= 50 ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
              }`}>{passThreshold}%</div>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: 'Shuffle Question Order', sub: 'Randomise for each student', val: shuffleQuestions, set: setShuffleQuestions, icon: Brain },
            { label: 'Shuffle MCQ Options', sub: 'Randomise answer choices', val: shuffleOptions, set: setShuffleOptions, icon: LayoutGrid },
          ].map(item => (
            <button key={item.label} type="button" onClick={() => item.set(!item.val)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                item.val ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:border-white/15'
              }`}>
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${item.val ? 'text-indigo-400' : 'text-gray-500'}`} />
                <div>
                  <p className={`text-sm font-medium ${item.val ? 'text-white' : 'text-gray-300'}`}>{item.label}</p>
                  <p className="text-xs text-gray-500">{item.sub}</p>
                </div>
              </div>
              <div className={`w-10 h-5.5 rounded-full transition-all relative ${item.val ? 'bg-indigo-600' : 'bg-gray-700'}`}
                style={{ height: '22px' }}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.val ? 'left-5' : 'left-0.5'}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Custom Instructions (collapsible) */}
        <button type="button" onClick={() => setShowInstructions(!showInstructions)}
          className="mt-4 flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-300 transition-colors">
          {showInstructions ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showInstructions ? 'Hide' : 'Add'} custom instructions for students
        </button>
        {showInstructions && (
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
            rows={3} placeholder="e.g. No external resources. Use Python 3.10+. Partial credit given for reasoning…"
            className="field-input mt-3 resize-none" />
        )}
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="flex gap-6 h-[560px] animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Left: Question Bank */}
      <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-white/10 space-y-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input value={qSearch} onChange={e => setQSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all" />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <select value={qTypeFilter} onChange={e => setQTypeFilter(e.target.value)}
                className="w-full pl-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 appearance-none">
                <option value="all">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="coding">Coding</option>
                <option value="subjective">Subjective</option>
              </select>
            </div>
            <div className="relative flex-1">
              <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <select value={qSubjectFilter} onChange={e => setQSubjectFilter(e.target.value)}
                className="w-full pl-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 appearance-none">
                {qSubjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{filteredQuestions.length} questions</span>
            <button type="button" onClick={() => setSelectedQuestions([...selectedQuestions, ...filteredQuestions.filter(q => !selectedQuestions.some(x => x.id === q.id))])}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Add all filtered
            </button>
          </div>
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
          {filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
              <BookOpen className="w-8 h-8 opacity-30" />
              <p className="text-sm">No questions match filters</p>
            </div>
          ) : filteredQuestions.map(q => {
            const meta = TYPE_META[q.type] || TYPE_META.mcq;
            const isSelected = selectedQuestions.some(x => x.id === q.id);
            return (
              <div key={q.id}
                className={`group flex items-start gap-3 p-4 transition-all cursor-pointer hover:bg-white/[0.04] ${isSelected ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : ''}`}
                onClick={() => toggleQuestion(q)}>
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                    {q.subject && <span className="text-[10px] text-gray-500">{q.subject}</span>}
                    <span className="ml-auto text-[10px] font-bold text-gray-400">{q.points}pts</span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2 leading-snug">{q.content}</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setPreviewQ(previewQ?.id === q.id ? null : q); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-indigo-400 transition-all flex-shrink-0">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Selected / Preview */}
      <div className="w-[340px] flex flex-col gap-4 flex-shrink-0">
        {/* Selected questions */}
        <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-sm font-bold text-white">{selectedQuestions.length} Selected</p>
              <p className="text-xs text-gray-500">{totalPoints} total points</p>
            </div>
            {Object.entries(typeBreakdown).map(([t, n]) => {
              const m = TYPE_META[t];
              return m ? (
                <span key={t} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${m.bg} ${m.color}`}>
                  {n} {m.label}
                </span>
              ) : null;
            })}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {selectedQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-gray-600 gap-2">
                <Plus className="w-6 h-6 opacity-40" />
                <p className="text-xs">Select questions from the left</p>
              </div>
            ) : selectedQuestions.map((q, i) => {
              const meta = TYPE_META[q.type] || TYPE_META.mcq;
              return (
                <div key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragEnter={() => handleDragEnterRow(i)}
                  onDragEnd={() => handleDrop(i)}
                  onDragOver={e => e.preventDefault()}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                    dragOver === i ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/8 bg-white/5 hover:border-white/15'
                  }`}>
                  <GripVertical className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-gray-500 w-5 text-center flex-shrink-0">{i + 1}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color} flex-shrink-0`}>{meta.label}</span>
                  <p className="flex-1 text-xs text-gray-300 line-clamp-1 min-w-0">{q.content}</p>
                  <span className="text-[10px] text-gray-500 flex-shrink-0">{q.points}p</span>
                  <button type="button" onClick={() => removeSelected(q.id)}
                    className="text-gray-600 hover:text-rose-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question preview */}
        {previewQ && (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex-shrink-0 max-h-64 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Preview</span>
              <button type="button" onClick={() => setPreviewQ(null)} className="text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-white font-medium mb-3 leading-snug">{previewQ.content}</p>
            {previewQ.type === 'mcq' && previewQ.options && (
              <div className="space-y-1.5">
                {previewQ.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[9px] font-bold text-gray-500">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            )}
            {previewQ.type === 'coding' && previewQ.starterCode && (
              <pre className="text-xs text-indigo-300 bg-black/30 rounded-lg p-3 font-mono overflow-x-auto">{previewQ.starterCode}</pre>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span>{previewQ.subject}</span>
              <span>·</span>
              <span>{previewQ.points} points</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
      {/* Open access toggle */}
      <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${openAccess ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-white/10 bg-white/[0.02]'}`}>
        <div>
          <p className="font-semibold text-white">Open Access</p>
          <p className="text-sm text-gray-400 mt-0.5">Any authenticated student can take this test</p>
        </div>
        <button type="button" onClick={() => setOpenAccess(!openAccess)}
          className={`relative w-12 h-6 rounded-full transition-all ${openAccess ? 'bg-emerald-600' : 'bg-gray-700'}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${openAccess ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      {!openAccess && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input value={sSearch} onChange={e => setSSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all" />
              </div>
              <select value={sDeptFilter} onChange={e => setSDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50">
                {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{selectedStudents.length} / {students.length} selected</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelectedStudents(filteredStudents)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Select all filtered</button>
                <button type="button" onClick={() => setSelectedStudents([])}
                  className="text-gray-500 hover:text-gray-300 font-medium transition-colors">Clear</button>
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-white/5">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-gray-600 gap-2">
                <Users className="w-6 h-6 opacity-40" />
                <p className="text-xs">No students match your filters</p>
              </div>
            ) : filteredStudents.map(s => {
              const isSelected = selectedStudents.some(x => x.id === s.id);
              const initials = s.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={s.id} onClick={() => toggleStudent(s)}
                  className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all hover:bg-white/[0.04] ${isSelected ? 'bg-indigo-500/5' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 text-gray-400'}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{s.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{s.email}</p>
                  </div>
                  {s.department && <span className="text-[10px] text-gray-500 px-2 py-1 rounded-lg bg-white/5 border border-white/10">{s.department}</span>}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-600'}`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderReview = () => {
    const start = startDate && startTime ? new Date(`${startDate}T${startTime}`) : null;
    const end   = start ? new Date(start.getTime() + duration * 60000) : null;
    const diffMeta = DIFFICULTY_OPTIONS.find(d => d.value === difficulty);

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white leading-tight">{title}</h3>
              <p className="text-gray-400 mt-1 text-sm max-w-xl">{description}</p>
            </div>
            {diffMeta && (
              <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-white/15 bg-white/5 flex-shrink-0 ${diffMeta.color}`}>
                <span className={`w-2 h-2 rounded-full ${diffMeta.dot}`} />
                {diffMeta.label}
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Duration', value: `${duration} min`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: BookOpen, label: 'Questions', value: selectedQuestions.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { icon: Star, label: 'Total Points', value: totalPoints, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { icon: Target, label: 'Pass Mark', value: `${passThreshold}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Time window */}
        {start && end && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">
                {start.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}

        {/* Question breakdown */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Question Breakdown</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(typeBreakdown).map(([t, n]) => {
              const m = TYPE_META[t];
              if (!m) return null;
              return (
                <div key={t} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${m.bg}`}>
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                  <span className={`text-sm font-bold ${m.color}`}>{n}</span>
                  <span className="text-xs text-gray-400">{m.label}</span>
                </div>
              );
            })}
          </div>
          {shuffleQuestions && (
            <p className="mt-3 text-xs text-indigo-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Question order will be shuffled for each student
            </p>
          )}
        </div>

        {/* Students */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-white">
                {openAccess ? 'Open Access' : `${selectedStudents.length} students assigned`}
              </p>
              <p className="text-xs text-gray-500">
                {openAccess ? 'All authenticated users can attempt' : selectedStudents.slice(0, 3).map(s => s.fullName.split(' ')[0]).join(', ') + (selectedStudents.length > 3 ? ` +${selectedStudents.length - 3} more` : '')}
              </p>
            </div>
          </div>
          {openAccess && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">Public</span>}
        </div>

        {/* Validation */}
        {selectedQuestions.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No questions selected — go back and add questions.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#080e1a] text-gray-100 font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#080e1a]/90 backdrop-blur-xl border-b border-white/8 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full transition-all border border-white/10 hover:scale-105">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Create Assessment</h1>
              <p className="text-xs text-gray-500">{STEPS[stepIndex].desc}</p>
            </div>
          </div>

          <button onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all hover:-translate-y-0.5 text-sm">
            <Sparkles className="w-4 h-4" />
            AI Auto-Generate
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Step indicator */}
        <div className="mb-10">
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isPast = idx < stepIndex;
              const isFuture = idx > stepIndex;
              return (
                <React.Fragment key={step.id}>
                  <button type="button"
                    onClick={() => isPast && setCurrentStep(step.id)}
                    disabled={isFuture}
                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all ${
                      isActive ? 'bg-indigo-600/20 border border-indigo-500/40' :
                      isPast ? 'hover:bg-white/5 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                    }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]' :
                      isPast ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/5'
                    }`}>
                      {isPast ? <Check className="w-4 h-4 text-indigo-300" /> : <step.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />}
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>{step.label}</p>
                      <p className={`text-[10px] leading-tight ${isActive ? 'text-indigo-300' : 'text-gray-600'}`}>{step.desc}</p>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 transition-all ${idx < stepIndex ? 'bg-indigo-500/50' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="mb-10">
          {currentStep === 'config'    && renderConfig()}
          {currentStep === 'questions' && renderQuestions()}
          {currentStep === 'students'  && renderStudents()}
          {currentStep === 'review'    && renderReview()}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button type="button" onClick={goPrev}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              stepIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20'
            }`}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-3">
            {/* Validation hint */}
            {!canProceed() && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                {currentStep === 'config' && 'Complete required fields to continue'}
                {currentStep === 'questions' && 'Select at least one question'}
                {currentStep === 'students' && 'Assign students or enable open access'}
              </p>
            )}

            {currentStep === 'review' ? (
              <button type="button" onClick={handlePublish}
                disabled={selectedQuestions.length === 0}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Trophy className="w-4 h-4" />
                Publish Test
              </button>
            ) : (
              <button type="button" onClick={goNext} disabled={!canProceed()}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.25)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#131c30] border border-indigo-500/30 rounded-3xl p-8 max-w-lg w-full shadow-[0_0_60px_rgba(99,102,241,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 flex items-center justify-center">
                    <Wand2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  AI Assessment Builder
                </h3>
                <p className="text-xs text-gray-500 mt-1">Describe your test, AI does the rest</p>
              </div>
              <button onClick={() => !isGenerating && setShowAiModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Describe the kind of test you want — topic, difficulty, focus areas, duration. The AI will auto-fill the title, description, and select the best matching questions from your bank.
            </p>

            <div className="mb-3 flex flex-wrap gap-2">
              {['React + State Management, 60 min', 'Advanced Python DSA, 90 min', 'SQL Fundamentals, 45 min'].map(ex => (
                <button key={ex} type="button" onClick={() => setAiPrompt(ex)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                  {ex}
                </button>
              ))}
            </div>

            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. A 60-minute intermediate Golang backend assessment covering concurrency and REST APIs…"
              className="w-full bg-black/30 border border-white/15 text-white rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm placeholder-gray-600 mb-4"
              disabled={isGenerating} />

            {aiError && (
              <div className="mb-4 p-3 bg-rose-900/30 border border-rose-500/40 rounded-xl text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {aiError}
              </div>
            )}

            <button onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating…</> : <><Sparkles className="w-5 h-5" /> Generate Assessment</>}
            </button>
          </div>
        </div>
      )}

      {/* Inline styles for field utilities */}
      <style>{`
        .glass-field { display: flex; flex-direction: column; gap: 4px; }
        .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; }
        .field-input {
          width: 100%; border-radius: 12px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1); color: white;
          padding: 10px 14px; font-size: 14px; outline: none; transition: all 0.15s;
        }
        .field-input:focus { border-color: rgba(99,102,241,0.5); background: rgba(255,255,255,0.06); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .field-input::placeholder { color: #4b5563; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        select option { background: #131c30; color: white; }
      `}</style>
    </div>
  );
}
