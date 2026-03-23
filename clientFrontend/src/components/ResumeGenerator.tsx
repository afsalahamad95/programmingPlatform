import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../api/chatApi';
import { FileText, Sparkles, Download, Copy, ScanLine, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const ResumeGenerator: React.FC = () => {
	const { user } = useAuth();
	const [resume, setResume] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);

	const handleGenerate = async () => {
		if (!user) {
			toast.error('You must be logged in to generate a resume');
			return;
		}

		setIsGenerating(true);
		setResume(null);

		try {
			const timer = setTimeout(() => {
				if (isGenerating && !resume) {
					toast('Compiling your achievements...', { icon: '📊' });
				}
			}, 2500);

			const response = await chatApi.generateResume(user.id as string);
			setResume(response.answer);
			clearTimeout(timer);
			toast.success('Resume synthesized successfully!');
		} catch (error) {
			console.error('Failed to generate resume:', error);
			toast.error('Failed to generate resume. Please try again.');
		} finally {
			setIsGenerating(false);
		}
	};

	const copyToClipboard = () => {
		if (resume) {
			navigator.clipboard.writeText(resume);
			toast.success('Copied to clipboard!');
		}
	};

	return (
		<div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in text-gray-200">
			{/* Header Area */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 flex items-center gap-3">
						<FileText className="w-8 h-8 text-emerald-400" />
						AI Resume Builder
					</h1>
					<p className="mt-2 text-gray-400">Instantly generate a highly optimized resume crafted from your platform statistics, tests, and challenges.</p>
				</div>
				<div className="hidden sm:block">
					<div className="glass-card px-4 py-2 flex items-center gap-2 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
						<div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
						<span className="text-sm font-mono text-emerald-200">ATS Optimizer Ready</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				{/* left Panel: Configuration */}
				<div className="lg:col-span-4 space-y-6">
					<div className="glass-card p-6 border border-white/10 relative overflow-hidden group">
						<div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
						
						<div className="relative z-10 flex flex-col items-center text-center space-y-6">
							<div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center p-1 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
								<div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
									<ScanLine className="w-8 h-8 text-emerald-400" />
								</div>
							</div>
							
							<div>
								<h3 className="text-lg font-bold text-white mb-2">Automated Extraction</h3>
								<p className="text-sm text-gray-400">
									Our AI analyzes your test scores, coding challenge completions, and overall proficiency to build a compelling narrative of your skills.
								</p>
							</div>

							<div className="w-full bg-black/40 rounded-lg p-4 border border-white/5 space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-xs font-mono text-gray-500">Targeting</span>
									<span className="text-xs font-bold text-emerald-400">Software Engineer</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-xs font-mono text-gray-500">Data Sources</span>
									<span className="text-xs font-bold text-teal-400">All Completed Tests</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-xs font-mono text-gray-500">Format</span>
									<span className="text-xs font-bold text-cyan-400">Markdown (ATS Friendly)</span>
								</div>
							</div>

							<button
								onClick={handleGenerate}
								disabled={isGenerating}
								className="w-full relative overflow-hidden group bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/20 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
								<div className="flex items-center justify-center gap-2 relative z-10">
									{isGenerating ? (
										<>
											<Loader2 className="w-5 h-5 animate-spin" />
											Extracting Metrics...
										</>
									) : (
										<>
											<Sparkles className="w-5 h-5" />
											Auto-Generate Resume
										</>
									)}
								</div>
							</button>
						</div>
					</div>
				</div>

				{/* Right Panel: Output */}
				<div className="lg:col-span-8">
					<div className={`glass-card h-full min-h-[500px] border relative transition-all duration-500 ${resume ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] bg-white/[0.02]' : 'border-white/5 bg-black/20'}`}>
						
						{isGenerating ? (
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<div className="relative w-32 h-32 mb-8">
									{/* Scanning animation rings */}
									<div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"></div>
									<div className="absolute inset-0 border-2 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
									<div className="absolute inset-4 border-2 border-teal-500/20 rounded-full"></div>
									<div className="absolute inset-4 border-2 border-teal-500 rounded-full border-b-transparent animate-spin-slow"></div>
									<div className="absolute inset-0 flex flex-col overflow-hidden">
										{/* Scanner line */}
										<div className="w-full h-1 bg-emerald-400 shadow-[0_0_10px_theme(colors.emerald.400)] absolute top-0 animate-[scan_2s_linear_infinite]"></div>
									</div>
									<div className="absolute inset-0 flex items-center justify-center">
										<FileText className="w-8 h-8 text-emerald-400" />
									</div>
								</div>
								
								<div className="w-64 space-y-3">
									<div className="h-2 bg-gray-800 rounded overflow-hidden">
										<div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-[pulse-fast_1s_ease-in-out_infinite] w-full origin-left transition-all"></div>
									</div>
									<div className="text-xs font-mono text-center text-emerald-300 animate-pulse">Quantifying skill proficiency indices...</div>
								</div>
							</div>
						) : resume ? (
							<div className="flex flex-col h-full animate-fade-in">
								<div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
									<h2 className="font-bold text-white flex items-center gap-2">
										<FileText className="w-5 h-5 text-emerald-400" />
										Generated Resume
									</h2>
									<div className="flex gap-2">
										<button 
											onClick={copyToClipboard}
											className="p-2 bg-gray-800/50 hover:bg-gray-700/80 rounded border border-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm"
										>
											<Copy className="w-4 h-4" /> Copy Text
										</button>
										<button 
											className="p-2 bg-emerald-600/30 hover:bg-emerald-600/50 rounded border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 transition-colors flex items-center gap-2 text-sm"
											onClick={() => toast('PDF download coming next update', { icon: '📄' })}
										>
											<Download className="w-4 h-4" /> Export PDF
										</button>
									</div>
								</div>
								{/* Resume Display Area - customized markdown styles specifically for a resume look */}
								<div className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-[#0f172a] rounded-b-xl">
									<div className="prose prose-invert prose-emerald max-w-none 
										prose-headings:text-white prose-headings:font-bold 
										/* Name/Title styling */
										prose-h1:text-center prose-h1:text-3xl prose-h1:mb-2 prose-h1:uppercase prose-h1:tracking-wider
										prose-h2:text-emerald-400 prose-h2:border-b prose-h2:border-emerald-500/30 prose-h2:pb-1 prose-h2:uppercase prose-h2:text-lg prose-h2:tracking-widest prose-h2:mt-8
										prose-h3:text-gray-200 prose-h3:text-base prose-h3:mb-1
										/* Content styling */
										prose-p:text-gray-300 prose-p:text-sm prose-p:my-2
										prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300
										prose-strong:text-emerald-300 prose-strong:font-semibold
										/* Lists (Experience/Skills) styling */
										prose-ul:mt-2 prose-ul:mb-4 prose-li:text-gray-300 prose-li:text-sm prose-li:my-0.5
										/* Make lists tight and professional */
										prose-li:marker:text-emerald-500">
										<ReactMarkdown>{resume}</ReactMarkdown>
									</div>
								</div>
							</div>
						) : (
							<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-50">
								<div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 border-dashed">
									<FileText className="w-10 h-10 text-gray-500" />
								</div>
								<h3 className="text-xl font-bold text-gray-300 mb-2">Resume Engine Idle</h3>
								<p className="text-sm text-gray-500 max-w-md">Click "Auto-Generate Resume" to allow the AI to synthesize your platform data into a professional curriculum vitae.</p>
							</div>
						)}
					</div>
				</div>
			</div>
			
			<style>{`
				.custom-scrollbar::-webkit-scrollbar { width: 6px; }
				.custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
				.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.3); border-radius: 10px; }
				.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }
				.animate-[pulse-fast_1s_ease-in-out_infinite] { animation: pulse-fast 1s ease-in-out infinite; }
				.animate-[scan_2s_linear_infinite] { animation: scan 2s linear infinite; }
				@keyframes pulse-fast {
					0%, 100% { transform: scaleX(0.8); opacity: 0.8; }
					50% { transform: scaleX(1); opacity: 1; }
				}
				@keyframes scan {
					0% { top: 0; opacity: 0; }
					10% { opacity: 1; }
					90% { opacity: 1; }
					100% { top: 100%; opacity: 0; }
				}
			`}</style>
		</div>
	);
};

export default ResumeGenerator;
