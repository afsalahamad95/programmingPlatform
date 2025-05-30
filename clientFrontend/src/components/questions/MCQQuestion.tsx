import React from "react";
import { MCQQuestion as MCQQuestionType } from "../../types";

interface MCQQuestionProps {
	question: MCQQuestionType;
	answer?: number;
	onChange: (value: number) => void;
}

export default function MCQQuestion({
	question,
	answer,
	onChange,
}: MCQQuestionProps) {
	return (
		<div className="space-y-4">
			<div className="prose max-w-none">
				<p className="text-lg">{question.content}</p>
			</div>
			<div className="space-y-2">
				{question.options.map((option, index) => (
					<label
						key={index}
						className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
							answer === index
								? "border-indigo-500 bg-indigo-50"
								: "border-gray-200 hover:bg-gray-50"
						}`}
					>
						<input
							type="radio"
							name={question.id}
							value={index}
							checked={answer === index}
							onChange={() => onChange(index)}
							className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
						/>
						<span className="text-gray-900">{option}</span>
					</label>
				))}
			</div>
			{answer !== undefined && (
				<div className="mt-4 p-4 bg-gray-50 rounded-lg">
					<p className="text-sm text-gray-600">
						Selected Answer: {question.options[answer]}
					</p>
				</div>
			)}
		</div>
	);
}
