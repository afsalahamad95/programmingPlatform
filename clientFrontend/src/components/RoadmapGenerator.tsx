import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../api/chatApi';
import { BrainCircuit, Sparkles, Map, Loader2, Download, Copy, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const RoadmapGenerator: React.FC = () => {
	const { user } = useAuth();
	const [targetRole, setTargetRole] = useState('Full Stack Developer');
	const [roadmap, setRoadmap] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);

	const handleGenerate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) {
			toast.error('You must be logged in to generate a roadmap');
			return;
		}

		setIsGenerating(true);
		setRoadmap(null);

		try {
			// Fast simulated loading state for better UX before API resolves
			const timer = setTimeout(() => {
				if (isGenerating && !roadmap) {
					toast('Analyzing your profile...', { icon: '🔍' });
				}
			}, 2000);

			const response = await chatApi.generateRoadmap(user.id as string, targetRole);
			setRoadmap(response.answer);
			clearTimeout(timer);
			toast.success('Roadmap generated successfully!');
		} catch (error) {
			console.error('Failed to generate roadmap:', error);
			toast.error('Failed to generate roadmap. Please try again.');
		} finally {
			setIsGenerating(false);
		}
	};

	const copyToClipboard = () => {
		if (roadmap) {
			navigator.clipboard.writeText(roadmap);
			toast.success('Copied to clipboard!');
		}
	};

	return (
		<div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in text-gray-200">
			{/* Header Area */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 flex items-center gap-3">
						<BrainCircuit className="w-8 h-8 text-indigo-400" />
						AI Career Roadmap
					</h1>
					<p className="mt-2 text-gray-400">Generate a personalized, AI-driven path to your dream role based on your current progress.</p>
				</div>
				<div className="hidden sm:block">
					<div className="glass-card px-4 py-2 flex items-center gap-2 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
						<div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
						<span className="text-sm font-mono text-indigo-200">Quantum Engine Online</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				{/* left Panel: Configuration */}
				<div className="lg:col-span-4 space-y-6">
					<div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
						<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
						
						<form onSubmit={handleGenerate} className="relative z-10">
							<div className="mb-6">
								<label className="block text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
									<Target className="w-4 h-4" /> Target Role
								</label>
								<div className="relative">
									<input
										type="text"
										value={targetRole}
										onChange={(e) => setTargetRole(e.target.value)}
										placeholder="e.g. Senior Frontend Engineer"
										className="w-full bg-gray-900/50 border border-indigo-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] placeholder-gray-500"
										required
									/>
									<div className="absolute inset-0 border rounded-lg border-indigo-400/0 focus-within:border-indigo-400/50 pointer-events-none transition-colors shadow-[0_0_10px_rgba(99,102,241,0.3)] opacity-0 focus-within:opacity-100"></div>
								</div>
							</div>

							<div className="mb-6">
								<h3 className="text-sm font-medium text-gray-400 mb-3">AI Engine Parameters:</h3>
								<div className="space-y-2">
									<div className="flex items-center justify-between text-xs font-mono">
										<span className="text-gray-500">Model</span>
										<span className="text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">Groq / Llama-3</span>
									</div>
									<div className="flex items-center justify-between text-xs font-mono">
										<span className="text-gray-500">Context</span>
										<span className="text-purple-300 bg-purple-500/10 px-2 py-1 rounded">Past Test Results + RAG</span>
									</div>
									<div className="flex items-center justify-between text-xs font-mono">
										<span className="text-gray-500">Format</span>
										<span className="text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">Markdown / Steps</span>
									</div>
								</div>
							</div>

							<button
								type="submit"
								disabled={isGenerating || !targetRole}
								className="w-full relative overflow-hidden group bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/20 to-indigo-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
								<div className="flex items-center justify-center gap-2 relative z-10">
									{isGenerating ? (
										<>
											<Loader2 className="w-5 h-5 animate-spin" />
											Synthesizing...
										</>
									) : (
										<>
											<Sparkles className="w-5 h-5" />
											Generate Roadmap
										</>
									)}
								</div>
							</button>
						</form>
					</div>
					
					{!roadmap && !isGenerating && (
						<div className="glass-card p-4 border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-3 text-sm text-indigo-200/80">
							<Map className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
							<p>The AI will scan your entire history on the platform, identifying your strong and weak points, and chart a specific course to your target role.</p>
						</div>
					)}
				</div>

				{/* Right Panel: Output */}
				<div className="lg:col-span-8">
					<div className={`glass-card h-full min-h-[500px] border relative transition-all duration-500 ${roadmap ? 'border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'border-white/5'}`}>
						
						{isGenerating ? (
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<div className="relative w-32 h-32 mb-8">
									<div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
									<div className="absolute inset-0 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
									<div className="absolute inset-4 border-2 border-purple-500/20 rounded-full"></div>
									<div className="absolute inset-4 border-2 border-purple-500 rounded-full border-b-transparent animate-spin-slow"></div>
									<div className="absolute inset-8 border-2 border-pink-500/20 rounded-full"></div>
									<div className="absolute inset-8 border-2 border-pink-500 rounded-full border-l-transparent animate-spin"></div>
									<div className="absolute inset-0 flex items-center justify-center">
										<BrainCircuit className="w-8 h-8 text-indigo-400 animate-pulse" />
									</div>
								</div>
								
								<div className="w-64 space-y-3">
									<div className="h-2 bg-gray-800 rounded overflow-hidden">
										<div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[pulse-fast_1s_ease-in-out_infinite] w-full origin-left transition-all"></div>
									</div>
									<div className="text-xs font-mono text-center text-indigo-300 animate-pulse">Running semantic analysis on test history...</div>
								</div>
							</div>
						) : roadmap ? (
							<div className="flex flex-col h-full animate-fade-in">
								<div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
									<h2 className="font-bold text-white flex items-center gap-2">
										<Target className="w-5 h-5 text-purple-400" />
										Path to {targetRole}
									</h2>
									<div className="flex gap-2">
										<button 
											onClick={copyToClipboard}
											className="p-2 bg-gray-800/50 hover:bg-gray-700/80 rounded border border-white/10 text-gray-300 hover:text-white transition-colors"
											title="Copy to clipboard"
										>
											<Copy className="w-4 h-4" />
										</button>
										<button 
											className="p-2 bg-indigo-600/30 hover:bg-indigo-600/50 rounded border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 transition-colors"
											title="Download PDF (Coming soon)"
											onClick={() => toast('PDF download coming next update', { icon: '📄' })}
										>
											<Download className="w-4 h-4" />
										</button>
									</div>
								</div>
								<div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
									<div className="prose prose-invert prose-indigo max-w-none 
										prose-headings:text-indigo-100 prose-headings:font-bold prose-headings:border-b-2 prose-headings:border-indigo-500/20 prose-headings:pb-2 
										prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg 
										prose-p:text-gray-300 prose-p:leading-relaxed 
										prose-a:text-indigo-400 prose-a:decoration-indigo-500/30 hover:prose-a:decoration-indigo-400 
										prose-strong:text-purple-300 
										prose-ul:list-none prose-ul:pl-0 prose-li:relative prose-li:pl-6 
										prose-li:before:content-[''] prose-li:before:absolute prose-li:before:left-0 prose-li:before:top-2 prose-li:before:w-2 prose-li:before:h-2 prose-li:before:bg-indigo-500/50 prose-li:before:rounded-full prose-li:before:shadow-[0_0_8px_rgba(99,102,241,0.5)]
										prose-code:text-pink-300 prose-code:bg-pink-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-pink-500/20 prose-code:before:content-none prose-code:after:content-none">
										<ReactMarkdown>{roadmap}</ReactMarkdown>
									</div>
								</div>
							</div>
						) : (
							<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-50">
								<div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 border-dashed">
									<Map className="w-10 h-10 text-gray-500" />
								</div>
								<h3 className="text-xl font-bold text-gray-300 mb-2">Awaiting Parameters</h3>
								<p className="text-sm text-gray-500 max-w-md">Select your target role and initialize the engine to generate your personalized career progression matrix.</p>
							</div>
						)}
					</div>
				</div>
			</div>
			
			<style>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: rgba(0,0,0,0.1);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: rgba(99, 102, 241, 0.3);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: rgba(99, 102, 241, 0.5);
				}
				.animate-[pulse-fast_1s_ease-in-out_infinite] {
					animation: pulse-fast 1s ease-in-out infinite;
				}
				@keyframes pulse-fast {
					0%, 100% { transform: scaleX(0.8); opacity: 0.8; }
					50% { transform: scaleX(1); opacity: 1; }
				}
			`}</style>
		</div>
	);
};

export default RoadmapGenerator;
