import React, { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";

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
	const editorRef = useRef<HTMLDivElement>(null);
	const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
		null
	);

	useEffect(() => {
		if (editorRef.current) {
			// Dispose previous editor instance if it exists
			if (monacoEditorRef.current) {
				monacoEditorRef.current.dispose();
			}

			// Map the language to a supported Monaco language
			const monacoLanguage = mapLanguage(language);

			// Initialize the editor
			monacoEditorRef.current = monaco.editor.create(editorRef.current, {
				value: code,
				language: monacoLanguage,
				theme: "vs-dark",
				automaticLayout: true,
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				fontSize: 14,
				lineNumbers: "on",
				readOnly,
				wordWrap: "on",
			});

			// Add onChange event handler
			monacoEditorRef.current.onDidChangeModelContent(() => {
				if (monacoEditorRef.current) {
					onChange(monacoEditorRef.current.getValue());
				}
			});
		}

		return () => {
			// Cleanup on unmount
			if (monacoEditorRef.current) {
				monacoEditorRef.current.dispose();
			}
		};
	}, [code, language, onChange, readOnly]);

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

	return (
		<div
			ref={editorRef}
			className="h-[600px] border border-gray-300 rounded-md overflow-hidden"
		/>
	);
};

export default CodeEditor;
