import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "react-query";
import { getTestAttempt, getTest } from "../api";
import {
	TestSubmission,
	Test,
	Question,
	MCQQuestion,
	CodingQuestion,
	Answer,
} from "../types";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
} from "recharts";

// Type predicates
const isMCQQuestion = (question: Question): question is MCQQuestion =>
	question.type === "mcq";
const isCodingQuestion = (question: Question): question is CodingQuestion =>
	question.type === "coding";

const COLORS = ["#10B981", "#EF4444", "#6366F1"]; // Green (Correct), Red (Incorrect), Indigo (Manual Review)

const TestResult: React.FC = () => {
	const { attemptId } = useParams<{ attemptId: string }>();

	const {
		data: submission,
		isLoading: isLoadingSubmission,
		error: submissionError,
	} = useQuery<TestSubmission>(
		["testAttempt", attemptId],
		() => getTestAttempt(attemptId!),
		{
			enabled: !!attemptId,
		}
	);

	const {
		data: test,
		isLoading: isLoadingTest,
		error: testError,
	} = useQuery<Test>(
		["test", submission?.testId],
		() => getTest(submission!.testId),
		{
			enabled: !!submission?.testId,
		}
	);

	if (isLoadingSubmission || isLoadingTest) {
		return (
			<div className="flex justify-center items-center h-[60vh]">
				<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
			</div>
		);
	}

	if (submissionError || testError || !submission || !test) {
		return (
			<div className="flex justify-center items-center h-[60vh]">
				<div className="bg-red-500/20 border border-red-500/50 text-red-100 p-6 rounded-xl backdrop-blur-md">
					<h3 className="text-xl font-bold mb-2">Error Loading Results</h3>
					<p>Could not load the test results. Please try again later.</p>
				</div>
			</div>
		);
	}

	// Calculate metrics
	let totalScore = 0;
	let maxScore = test.questions.reduce((total, q) => total + q.points, 0);
	let correctCount = 0;
	let incorrectCount = 0;
	let pendingReviewCount = 0;

	const answersWithFeedback = submission.answers.map((answer) => {
		const question = test.questions.find((q) => q.id === answer.questionId);
		let isCorrect = false;
		let pointsEarned = 0;
		let status = "pending";

		if (question?.type === "mcq" && isMCQQuestion(question)) {
			const selectedIndex = parseInt(answer.answer);
			isCorrect = selectedIndex === question.correctOption;
			if (isCorrect) {
				totalScore += question.points;
				pointsEarned = question.points;
				correctCount++;
				status = "correct";
			} else {
				incorrectCount++;
				status = "incorrect";
			}
		} else {
			pendingReviewCount++;
		}

		return {
			...answer,
			question,
			isCorrect,
			pointsEarned,
			status,
		};
	});

	const accuracyData = [
		{ name: "Correct", value: correctCount },
		{ name: "Incorrect", value: incorrectCount },
		{ name: "Needs Review", value: pendingReviewCount },
	].filter((d) => d.value > 0);

	const scoreData = answersWithFeedback
		.filter((a) => a.question?.type === "mcq")
		.map((a, idx) => ({
			name: `Q${idx + 1}`,
			points: a.pointsEarned,
			max: a.question?.points || 0,
		}));

	const gradePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

	return (
		<div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in text-gray-100">
			{/* Header Section */}
			<div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
				{/* Background Glow */}
				<div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl point-events-none"></div>
				<div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl point-events-none"></div>
				
				<div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
					<div>
						<h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
							Performance Analytics
						</h1>
						<p className="text-xl text-gray-300">
							Assessment: <span className="font-semibold text-white">{test.title}</span>
						</p>
						<p className="text-sm text-gray-400 mt-1">
							Submitted on {new Date(submission.submittedAt).toLocaleString()}
						</p>
					</div>
					<div className="mt-6 md:mt-0 text-center bg-black/30 px-8 py-4 rounded-xl border border-white/10 drop-shadow-xl">
						<p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Score</p>
						<div className="flex items-baseline justify-center space-x-2">
							<span className="text-5xl font-black text-white">{totalScore}</span>
							<span className="text-xl text-gray-400 font-medium">/ {maxScore}</span>
						</div>
						<div className="mt-2 text-sm">
							<span className={`px-2 py-1 rounded-full font-medium ${gradePercentage >= 80 ? 'bg-green-500/20 text-green-300' : gradePercentage >= 60 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
								{gradePercentage.toFixed(1)}% Accuracy
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Charts Section */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Accuracy Donut Chart */}
				<div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
					<h3 className="text-lg font-semibold text-gray-200 mb-4 w-full text-left">Response Accuracy Breakdown</h3>
					<div className="w-full h-64">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={accuracyData}
									cx="50%"
									cy="50%"
									innerRadius={60}
									outerRadius={90}
									paddingAngle={5}
									dataKey="value"
									stroke="none"
								>
									{accuracyData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.name === 'Correct' ? '#10B981' : entry.name === 'Incorrect' ? '#EF4444' : '#6366F1'} />
									))}
								</Pie>
								<Tooltip
									contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff' }}
									itemStyle={{ color: '#fff' }}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>
					<div className="flex justify-center space-x-6 mt-4">
						<div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div><span className="text-sm">Correct ({correctCount})</span></div>
						<div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-500 mr-2"></div><span className="text-sm">Incorrect ({incorrectCount})</span></div>
						{pendingReviewCount > 0 && <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div><span className="text-sm">Need Review ({pendingReviewCount})</span></div>}
					</div>
				</div>

				{/* Score Distribution Bar Chart */}
				<div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
					<h3 className="text-lg font-semibold text-gray-200 mb-4">Points per Question</h3>
					<div className="w-full h-64">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={scoreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
								<XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.7)'}} />
								<YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.7)'}} />
								<Tooltip
									cursor={{ fill: 'rgba(255,255,255,0.05)' }}
									contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff' }}
								/>
								<Bar dataKey="points" name="Points Earned" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* Detailed Answers Section */}
			<div className="bg-transparent space-y-6">
				<h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 mb-6 drop-shadow-md">
					Detailed Analysis
				</h2>
				
				{answersWithFeedback.map((item, index) => {
					if (!item.question) return null;

					const isMcq = item.question.type === "mcq" && isMCQQuestion(item.question);
					let mcqCorrectIndex = -1;
					let mcqSelectedIndex = parseInt(item.answer);

					if (isMcq) {
						mcqCorrectIndex = (item.question as MCQQuestion).correctOption;
					}

					return (
						<div
							key={index}
							className={`relative overflow-hidden bg-white/5 backdrop-blur-lg border rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 ${
								item.status === 'correct' 
									? 'border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
									: item.status === 'incorrect' 
										? 'border-rose-500/30 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]' 
										: 'border-indigo-500/30'
							}`}
						>
							{/* Status Badge */}
							<div className="absolute top-6 right-6 flex flex-col items-end">
								{item.status === 'correct' ? (
									<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
										<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
										CORRECT
									</span>
								) : item.status === 'incorrect' ? (
									<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
										<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
										INCORRECT
									</span>
								) : (
									<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
										<svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
										NEEDS REVIEW
									</span>
								)}
								<span className="text-gray-400 text-sm mt-2">
									{item.pointsEarned} / {item.question.points} pts
								</span>
							</div>

							<div className="pr-32">
								<h4 className="text-lg font-medium text-white mb-4 flex items-start">
									<span className="text-gray-500 text-base font-bold mr-3 mt-1">Q{index + 1}.</span>
									{item.question.content}
								</h4>

								{isMcq ? (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
										{/* Expected vs Actual */}
										<div className="bg-black/20 border border-white/5 rounded-xl p-4">
											<p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Your Answer</p>
											<p className={`text-sm ${item.status === 'correct' ? 'text-emerald-300' : 'text-rose-300'}`}>
												{(item.question as MCQQuestion).options[mcqSelectedIndex]}
											</p>
										</div>
										<div className="bg-black/20 border border-white/5 rounded-xl p-4">
											<p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Correct Answer</p>
											<p className="text-sm text-emerald-300">
												{(item.question as MCQQuestion).options[mcqCorrectIndex]}
											</p>
										</div>
									</div>
								) : (
									<div className="mt-4">
										<p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Your Submission</p>
										<div className="bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto">
											<pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">{item.answer}</pre>
										</div>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
			
			<div className="flex justify-center mt-12 mb-8">
				<Link to="/" className="px-8 py-3 rounded-full font-bold tracking-wide text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50">
					Return to Dashboard
				</Link>
			</div>
		</div>
	);
};

export default TestResult;
