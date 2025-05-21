import React from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
	code: string;
	language: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
	code,
	language,
	onChange,
	readOnly = false,
}) => {
	// Map backend language to Monaco supported language
	const mapLanguage = (backendLanguage: string): string => {
		const languageMap: Record<string, string> = {
			javascript: "javascript",
			python: "python",
			java: "java",
			cpp: "cpp",
			c: "c",
			csharp: "csharp",
			go: "go",
			ruby: "ruby",
			typescript: "typescript",
			php: "php",
		};

		return languageMap[backendLanguage.toLowerCase()] || "plaintext";
	};

	const handleEditorChange = (value: string | undefined) => {
		if (value !== undefined) {
			onChange(value);
		}
	};

	return (
		<div className="h-[600px] border border-gray-300 rounded-md overflow-hidden">
			<Editor
				height="100%"
				width="100%"
				language={mapLanguage(language)}
				value={code}
				theme="vs-dark"
				onChange={handleEditorChange}
				options={{
					minimap: { enabled: false },
					scrollBeyondLastLine: false,
					fontSize: 14,
					lineNumbers: "on",
					readOnly,
					wordWrap: "on",
					automaticLayout: true,
				}}
			/>
		</div>
	);
};

export default CodeEditor;
