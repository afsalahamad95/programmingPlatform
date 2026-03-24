import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { getTest, submitTest } from "../api";
import { chatApi } from "../api/chatApi";
import { useAuth } from "../contexts/AuthContext";
import {
	Test,
	Question,
	MCQQuestion,
	SubjectiveQuestion,
	CodingQuestion,
} from "../types";
import MCQQuestionComponent from "./questions/MCQQuestion";
import SubjectiveQuestionComponent from "./questions/SubjectiveQuestion";
import CodingQuestionComponent from "./questions/CodingQuestion";
import { 
	ChevronLeft, 
	ChevronRight, 
	Clock, 
	AlertTriangle, 
	Sparkles, 
	Send, 
	Layout, 
	XCircle,
	Camera,
	Maximize2
} from "lucide-react";
import toast from "react-hot-toast";

const isMCQQuestion = (question: Question): question is MCQQuestion => question.type === "mcq";
const isSubjectiveQuestion = (question: Question): question is SubjectiveQuestion => question.type === "subjective";
const isCodingQuestion = (question: Question): question is CodingQuestion => question.type === "coding";

const TestAttempt: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user } = useAuth();
	
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [timeLeft, setTimeLeft] = useState<number | null>(null);
	
	// AI Hint state
	const [hint, setHint] = useState<string | null>(null);
	const [isGeneratingHint, setIsGeneratingHint] = useState(false);

	// Proctoring States
	const [warnings, setWarnings] = useState(0);
	const [hasStarted, setHasStarted] = useState(false);
	
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const lastViolationRef = useRef<number>(0);
	const answersRef = useRef(answers);
	
	useEffect(() => {
		answersRef.current = answers;
		// Auto-save to localStorage
		if (id && Object.keys(answers).length > 0) {
			localStorage.setItem(`test_draft_${id}`, JSON.stringify(answers));
		}
	}, [answers, id]);

	const { data: test, isLoading } = useQuery<Test>(
		["test", id],
		() => getTest(id!),
		{
			enabled: !!id,
			onSuccess: (data) => {
				// Initialize timer
				setTimeLeft(data.duration * 60);
				// Load draft
				const draft = localStorage.getItem(`test_draft_${id}`);
				if (draft) {
					try {
						setAnswers(JSON.parse(draft));
						toast.success("Draft restored", { icon: '💾' });
					} catch (e) { console.error("Failed to restore draft", e); }
				}
			}
		}
	);

	// Timer Logic
	useEffect(() => {
		if (hasStarted && timeLeft !== null && timeLeft > 0) {
			const timer = setInterval(() => {
				setTimeLeft(prev => (prev !== null ? prev - 1 : null));
			}, 1000);
			return () => clearInterval(timer);
		} else if (timeLeft === 0 && hasStarted) {
			toast.error("Time's up! Submitting automatically...");
			handleSubmit();
		}
	}, [hasStarted, timeLeft]);

	const submitTestMutation = useMutation(
		(data: { testId: string; answers: Record<string, string> }) => {
			if (!user?.id || !user.email) throw new Error("Authentication required");
			return submitTest(data.testId, {
				testId: data.testId,
				studentId: user.id,
				studentName: user.fullName || "Unknown User",
				studentEmail: user.email,
				institution: user.institution || "",
				department: user.department || "",
				answers: Object.entries(data.answers).map(([questionId, answer]) => ({
					questionId,
					answer,
				})),
			});
		},
		{
			onSuccess: (submission) => {
				localStorage.removeItem(`test_draft_${id}`);
				queryClient.invalidateQueries("testResults");
				navigate(`/results/${(submission as { id?: string; _id?: string }).id || (submission as { id?: string; _id?: string })._id}`);
			},
			onError: (error) => {
				toast.error(`Submission failed: ${error instanceof Error ? error.message : "Error"}`);
			},
		}
	);

	const handleStartTest = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			streamRef.current = stream;
			if (videoRef.current) videoRef.current.srcObject = stream;
			
			const elem = document.documentElement;
			if (elem.requestFullscreen && !document.fullscreenElement) {
				await elem.requestFullscreen();
			}
			setHasStarted(true);
			toast.success("Assessment Started", { icon: '🚀' });
		} catch (err) {
			toast.error("Cam access required to start proctored exam");
		}
	};

	const handleViolation = () => {
		const now = Date.now();
		if (now - lastViolationRef.current < 2000) return;
		lastViolationRef.current = now;

		setWarnings(prev => {
			const current = prev + 1;
			if (current >= 3) {
				toast.error("MAX WARNINGS EXCEEDED: Auto-submitting assessment for security violations.");
				handleSubmit();
			} else {
				toast.error(`PROCTORING WARNING (${current}/3): Window focus lost!`, { duration: 4000 });
			}
			return current;
		});
	};

	useEffect(() => {
		if (!hasStarted) return;
		const handleVisibilityChange = () => document.hidden && handleViolation();
		const handleBlur = () => handleViolation();
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("blur", handleBlur);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("blur", handleBlur);
		};
	}, [hasStarted]);

	useEffect(() => {
		return () => {
			if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
			if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		};
	}, []);

	const handleGetHint = async () => {
		const q = test?.questions[currentQuestionIndex];
		if (!q) return;
		setIsGeneratingHint(true);
		try {
			const res = await chatApi.getTestHint(q.content, q.type);
			setHint(res.hint);
		} catch (e) {
			toast.error("AI Hint currently unavailable");
		} finally {
			setIsGeneratingHint(false);
		}
	};

	const handleSubmit = () => {
		if (!test || !user) return;
		submitTestMutation.mutate({ testId: test.id, answers: answersRef.current });
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	if (isLoading || !test) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div></div>;

	if (!hasStarted) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
				<div className="glass-card max-w-2xl w-full p-8 relative overflow-hidden">
					<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full -mr-32 -mt-32"></div>
					<div className="relative z-10 text-center">
						<h2 className="text-3xl font-bold text-white mb-2">{test.title}</h2>
						<p className="text-gray-400 mb-8">{test.description}</p>
						
						<div className="grid grid-cols-2 gap-4 mb-8">
							<div className="bg-white/5 border border-white/10 rounded-xl p-4">
								<Clock className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
								<div className="text-xl font-bold text-white">{test.duration}m</div>
								<div className="text-[10px] text-gray-500 uppercase tracking-widest">Duration</div>
							</div>
							<div className="bg-white/5 border border-white/10 rounded-xl p-4">
								<Layout className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
								<div className="text-xl font-bold text-white">{test.questions.length}</div>
								<div className="text-[10px] text-gray-500 uppercase tracking-widest">Questions</div>
							</div>
						</div>

						<div className="text-left bg-black/30 rounded-xl p-6 border border-white/10 space-y-4 mb-8">
							<h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
								<AlertTriangle className="w-5 h-5" /> Requirements
							</h3>
							<ul className="space-y-3 text-sm text-gray-400">
								<li className="flex items-center gap-3">
									<Camera className="w-4 h-4 text-emerald-500" /> Webcam monitored via AI proctoring.
								</li>
								<li className="flex items-center gap-3">
									<Maximize2 className="w-4 h-4 text-emerald-500" /> Fullscreen mode strictly enforced.
								</li>
								<li className="flex items-center gap-3">
									<XCircle className="w-4 h-4 text-red-500" /> Tab switching will trigger auto-submission.
								</li>
							</ul>
						</div>

						<button 
							onClick={handleStartTest}
							className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl text-lg font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-indigo-500/50"
						>
							INITIALIZE ASSESSMENT
						</button>
					</div>
				</div>
			</div>
		);
	}

	const currentQuestion = test.questions[currentQuestionIndex];

	return (
		<div className="fixed inset-0 bg-[#0f172a] text-gray-200 flex flex-col pt-16">
			{/* Top Bar */}
			<div className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-white/[0.02] backdrop-blur-md z-20">
				<div className="flex items-center gap-4">
					<div className="text-lg font-bold text-white flex items-center gap-2">
						<Layout className="w-5 h-5 text-indigo-400" />
						{test.title}
					</div>
					<div className="h-4 w-px bg-white/10"></div>
					<div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${timeLeft && timeLeft < 300 ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-emerald-400'}`}>
						<Clock className={`w-4 h-4 ${timeLeft && timeLeft < 300 ? 'animate-pulse' : ''}`} />
						<span className="font-mono font-bold text-sm">
							{timeLeft !== null ? formatTime(timeLeft) : "--:--"}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button 
						onClick={() => setShowConfirmation(true)}
						className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
					>
						<Send className="w-4 h-4" /> Final Submit
					</button>
				</div>
			</div>

			<div className="flex-grow flex overflow-hidden">
				{/* left Sidebar: Navigator & Proctor */}
				<div className="w-80 border-r border-white/10 flex flex-col bg-black/20 overflow-y-auto custom-scrollbar">
					<div className="p-6">
						<h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Question Navigator</h3>
						<div className="grid grid-cols-5 gap-2">
							{test.questions.map((q, idx) => {
								const isAnswered = answers[q.id];
								const isCurrent = idx === currentQuestionIndex;
								return (
									<button
										key={q.id}
										onClick={() => {
											setCurrentQuestionIndex(idx);
											setHint(null);
										}}
										className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${
											isCurrent ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' :
											isAnswered ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' :
											'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'
										}`}
									>
										{idx + 1}
									</button>
								);
							})}
						</div>
					</div>

					<div className="mt-auto p-4 border-t border-white/10">
						<div className="glass-card !bg-black/40 border-indigo-500/30 p-4 relative overflow-hidden group">
							<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
							<div className="flex items-center justify-between mb-3">
								<div className="text-[10px] font-bold text-indigo-400 tracking-widest flex items-center gap-2">
									<div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
									PROCTOR FEED
								</div>
								{warnings > 0 && (
									<div className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30">
										{warnings}/3 WARNINGS
									</div>
								)}
							</div>
							<video 
								ref={videoRef} 
								autoPlay 
								muted 
								playsInline
								className="w-full aspect-video object-cover rounded shadow-inner grayscale group-hover:grayscale-0 transition-all duration-700"
							/>
						</div>
					</div>
				</div>

				{/* Center Area: Question & Answer */}
				<div className="flex-grow flex flex-col relative overflow-hidden">
					<div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
						<div className="max-w-4xl mx-auto space-y-8">
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<span className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-bold font-mono border border-indigo-500/20 uppercase">
										{currentQuestion.type}
									</span>
									<span className="text-gray-500 text-xs font-mono">
										Points: {currentQuestion.points || 1}
									</span>
								</div>
								<h1 className="text-2xl font-bold text-white leading-relaxed">
									{currentQuestion.content}
								</h1>
							</div>

							<div className="glass-card !bg-white/[0.03] border border-white/5 p-8">
								{/* Render Content */}
								{currentQuestion.type === 'mcq' && isMCQQuestion(currentQuestion) && (
									<MCQQuestionComponent
										question={currentQuestion}
										answer={answers[currentQuestion.id] ? parseInt(answers[currentQuestion.id]) : undefined}
										onChange={(val) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val.toString() }))}
									/>
								)}
								{currentQuestion.type === 'subjective' && isSubjectiveQuestion(currentQuestion) && (
									<SubjectiveQuestionComponent
										question={currentQuestion}
										answer={answers[currentQuestion.id] || ""}
										onChange={(val) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))}
									/>
								)}
								{currentQuestion.type === 'coding' && isCodingQuestion(currentQuestion) && (
									<CodingQuestionComponent
										question={currentQuestion}
										answer={answers[currentQuestion.id] || currentQuestion.starterCode}
										onChange={(val) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))}
									/>
								)}
							</div>

							{hint && (
								<div className="p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl animate-in slide-in-from-bottom-4 flex gap-4">
									<Sparkles className="w-6 h-6 text-indigo-400 flex-shrink-0" />
									<div className="space-y-1">
										<p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">AI Assistance Hint</p>
										<p className="text-sm text-indigo-100">{hint}</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Navigation Bar */}
					<div className="h-20 border-t border-white/10 px-8 flex items-center justify-between bg-black/20">
						<div className="flex gap-4">
							<button 
								onClick={() => {
									setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
									setHint(null);
								}}
								disabled={currentQuestionIndex === 0}
								className="flex items-center gap-2 px-6 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
							>
								<ChevronLeft className="w-4 h-4" /> Previous
							</button>
							<button 
								onClick={() => {
									if (currentQuestionIndex < test.questions.length - 1) {
										setCurrentQuestionIndex(prev => prev + 1);
										setHint(null);
									} else {
										setShowConfirmation(true);
									}
								}}
								className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:border-indigo-500/50 transition-all font-bold group"
							>
								{currentQuestionIndex === test.questions.length - 1 ? 'Review' : 'Save & Next'}
								<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</button>
						</div>

						<button 
							onClick={handleGetHint}
							disabled={isGeneratingHint || hint !== null}
							className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-100 transition-all disabled:opacity-50"
						>
							{isGeneratingHint ? <div className="animate-spin text-lg">⏳</div> : <Sparkles className="w-4 h-4" />}
							{hint ? "Hint Applied" : "Request AI Hint"}
						</button>
					</div>
				</div>
			</div>

			{/* Confirmation Modal */}
			{showConfirmation && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
					<div className="glass-card max-w-md w-full p-8 text-center border-indigo-500/30">
						<div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
							<Send className="w-8 h-8" />
						</div>
						<h3 className="text-2xl font-bold text-white mb-2">Ready to Submit?</h3>
						<p className="text-gray-400 mb-8 text-sm">You have answered {Object.keys(answers).length} of {test.questions.length} questions. Once submitted, you cannot modify your responses.</p>
						<div className="flex gap-4">
							<button 
								onClick={() => setShowConfirmation(false)}
								className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-all"
							>
								Return to Test
							</button>
							<button 
								onClick={handleSubmit}
								className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg"
							>
								Finish & Submit
							</button>
						</div>
					</div>
				</div>
			)}
			
			<style>{`
				.custom-scrollbar::-webkit-scrollbar { width: 4px; }
				.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
				.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
				.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
			`}</style>
		</div>
	);
};

export default TestAttempt;
