import React, { useState } from 'react';
import { Calendar, ArrowLeft, Wand2, Sparkles, Loader2, X } from 'lucide-react';
import { Question, Student } from '../types';
import QuestionSelector from './QuestionSelector';
import StudentSelector from './StudentSelector';
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
}

const mockStudents: Student[] = [
  { id: '1', fullName: 'John Doe', email: 'john@university.edu', department: 'Computer Science' },
  { id: '2', fullName: 'Jane Smith', email: 'jane@university.edu', department: 'Computer Science' },
  { id: '3', fullName: 'Alice Johnson', email: 'alice@university.edu', department: 'Mathematics' },
  { id: '4', fullName: 'Bob Wilson', email: 'bob@university.edu', department: 'Mathematics' },
  { id: '5', fullName: 'Carol Brown', email: 'carol@university.edu', department: 'Physics' },
];

export default function TestScheduler({ onSchedule, onBack, questions }: TestSchedulerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [currentStep, setCurrentStep] = useState<'details' | 'questions' | 'students'>('details');

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(start.getTime() + duration * 60000);
    
    onSchedule({
      title,
      description,
      startTime: start,
      endTime: end,
      duration,
      questions: selectedQuestions,
      allowedStudents: selectedStudents,
    });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const slimQuestions = questions.map(q => ({
        id: q.id, title: q.content, topic: q.subject, type: q.type
      }));
      const res = await chatApi.autoSchedule(aiPrompt, slimQuestions);
      
      setTitle(res.title || title);
      setDescription(res.description || description);
      setDuration(res.duration || 60);

      if (res.selected_question_ids && Array.isArray(res.selected_question_ids)) {
        const matchingQuestions = questions.filter(q => res.selected_question_ids.includes(q.id));
        setSelectedQuestions(matchingQuestions);
      }
      setShowAiModal(false);
      setAiPrompt('');
      setCurrentStep('questions'); // Move to questions to review them
    } catch (err: any) {
      setAiError(err.message || 'Failed to auto-generate from AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleQuestion = (question: Question) => {
    setSelectedQuestions(prev => 
      prev.some(q => q.id === question.id)
        ? prev.filter(q => q.id !== question.id)
        : [...prev, question]
    );
  };

  const toggleStudent = (student: Student) => {
    setSelectedStudents(prev =>
      prev.some(s => s.id === student.id)
        ? prev.filter(s => s.id !== student.id)
        : [...prev, student]
    );
  };

  const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);
  const today = new Date().toISOString().split('T')[0];

  const renderStep = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm space-y-4 shadow-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Test Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md bg-gray-900 border border-gray-700 text-white shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-2 px-3 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-gray-900 border border-gray-700 text-white shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-2 px-3 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md bg-gray-900 border border-gray-700 text-white shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-2 px-3 transition-colors [color-scheme:dark]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-md bg-gray-900 border border-gray-700 text-white shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-2 px-3 transition-colors [color-scheme:dark]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-md bg-gray-900 border border-gray-700 text-white shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-2 px-3 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'questions':
        return (
          <div className="bg-white rounded-xl p-4 shadow-inner">
            <QuestionSelector
              questions={questions}
              selectedQuestions={selectedQuestions}
              onToggleQuestion={toggleQuestion}
            />
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500 px-2 font-medium">
              <span>Selected Questions: <strong className="text-indigo-600">{selectedQuestions.length}</strong></span>
              <span>Total Points: <strong className="text-indigo-600">{totalPoints}</strong></span>
            </div>
          </div>
        );

      case 'students':
        return (
          <div className="bg-white rounded-xl p-4 shadow-inner">
             <StudentSelector
              students={mockStudents}
              selectedStudents={selectedStudents}
              onToggleStudent={toggleStudent}
              onSelectAll={() => setSelectedStudents(mockStudents)}
              onDeselectAll={() => setSelectedStudents([])}
            />
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'details': return title && description && startDate && startTime && duration;
      case 'questions': return selectedQuestions.length > 0;
      case 'students': return selectedStudents.length > 0;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-gray-100 p-8 font-sans transition-all duration-500 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B1120] to-[#0B1120] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full transition-all border border-white/10 hover:border-white/20 hover:scale-105">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
                <Calendar className="w-7 h-7 text-indigo-400" />
                Schedule Test
              </h2>
              <p className="text-gray-400 text-sm mt-1">Configure and assign tests to students</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Generate with AI
          </button>
        </div>

        {/* Custom Progress Bar */}
        <div className="mb-10 flex items-center justify-between relative max-w-2xl mx-auto">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-800 rounded-full -z-10" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full -z-10 transition-all duration-500 ease-out"
            style={{ width: currentStep === 'details' ? '0%' : currentStep === 'questions' ? '50%' : '100%' }}
          />
          
          {(['details', 'questions', 'students'] as const).map((step, idx) => {
            const isActive = currentStep === step;
            const isPast = ['details', 'questions', 'students'].indexOf(currentStep) > idx;
            
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-lg ${
                  isActive ? 'bg-indigo-600 text-white shadow-indigo-500/50 scale-110 ring-4 ring-indigo-900' : 
                  isPast ? 'bg-purple-500 text-white shadow-purple-500/30' : 
                  'bg-gray-800 text-gray-400 border border-gray-700'
                }`}>
                  {idx + 1}
                </div>
                <span className={`mt-3 text-xs font-medium uppercase tracking-wider ${isActive ? 'text-indigo-400' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="transition-all duration-300">
            {renderStep()}
          </div>

          <div className="flex justify-between mt-10 pt-6 border-t border-gray-800">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 'questions') setCurrentStep('details');
                if (currentStep === 'students') setCurrentStep('questions');
              }}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                currentStep === 'details' ? 'opacity-0 pointer-events-none' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Previous Step
            </button>
            
            {currentStep === 'students' ? (
              <button
                type="submit"
                disabled={!canProceed()}
                className="px-8 py-2.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                Schedule Test
              </button>
            ) : (
              <button
                type="button"
                disabled={!canProceed()}
                onClick={() => {
                  if (currentStep === 'details') setCurrentStep('questions');
                  if (currentStep === 'questions') setCurrentStep('students');
                }}
                className="px-8 py-2.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
              >
                Next Step
              </button>
            )}
          </div>
        </form>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1e293b] border border-indigo-500/30 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_40px_rgba(99,102,241,0.2)]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" /> AI Scheduler Magic
              </h3>
              <button onClick={() => !isGenerating && setShowAiModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-indigo-200 mb-4 leading-relaxed">
              Describe the type of test you want to create (e.g., "Intermediate Frontend test focusing on React and state management"). AI will auto-fill the title, description, and hand-pick the best questions from your bank.
            </p>
            
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="E.g. A 60 minute mid-level Golang backend assessment..."
              className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none mb-4"
              disabled={isGenerating}
            />

            {aiError && (
              <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {aiError}
              </div>
            )}

            <button
              onClick={handleAiGenerate}
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full relative overflow-hidden group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-70"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Weaving AI Magic...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Framework
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}