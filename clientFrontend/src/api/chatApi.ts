/**
 * chatApi.ts — thin wrapper around the LLM / RAG server endpoints.
 * The Vite dev-server proxies /llm → http://localhost:8000
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
}

export interface IngestResponse {
  message: string;
  count: number;
}

export interface RoadmapFromResultPayload {
  test_title: string;
  student_name?: string;
  score_pct: number;
  grade: string;
  correct: number;
  incorrect: number;
  pending: number;
  total_questions: number;
  subject_breakdown: Record<string, { correct: number; total: number }>;
  weak_topics: string[];
}

const LLM_BASE = "/llm";

export const chatApi = {
  /** Health-check the LLM server */
  async healthCheck(): Promise<{ status: string; kb_document_count: number; groq_configured: boolean }> {
    const res = await fetch(`${LLM_BASE}/health`);
    if (!res.ok) throw new Error("LLM server unreachable");
    return res.json();
  },

  /** Send a conversation to the RAG chatbot and receive an answer */
  async sendMessage(messages: ChatMessage[], contextHint?: string): Promise<ChatResponse> {
    const res = await fetch(`${LLM_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context_hint: contextHint ?? null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail ?? "Chat request failed");
    }
    return res.json();
  },

  /** Ingest documents into the RAG knowledge base */
  async ingest(documents: string[], metadata?: Record<string, unknown>[]): Promise<IngestResponse> {
    const res = await fetch(`${LLM_BASE}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents, metadata: metadata ?? null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail ?? "Ingest request failed");
    }
    return res.json();
  },

  /** Generate a study roadmap from test results */
  async generateRoadmapFromResult(payload: RoadmapFromResultPayload): Promise<{ answer: string }> {
    const res = await fetch(`${LLM_BASE}/roadmap-from-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail ?? "Roadmap generation failed");
    }
    return res.json();
  },

  /** Generate a career roadmap based on student's profile */
  async generateRoadmap(studentId: string, targetRole: string): Promise<{ answer: string }> {
    const res = await fetch(`${LLM_BASE}/roadmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, target_role: targetRole }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail ?? "Roadmap generation failed");
    }
    return res.json();
  },

	/** Generate a tailored resume based on student's profile */
	async generateResume(studentId: string): Promise<{ answer: string }> {
		const res = await fetch(`${LLM_BASE}/resume`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ student_id: studentId }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({ detail: "Unknown error" }));
			throw new Error(err.detail ?? "Resume generation failed");
		}
		return res.json();
	},

	/** Generate a hint for a specific question */
	async getTestHint(questionContent: string, questionType: string, previousAnswers?: string): Promise<{ hint: string }> {
		const res = await fetch(`${LLM_BASE}/test-hint`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ question_content: questionContent, question_type: questionType, previous_answers: previousAnswers ?? null }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({ detail: "Unknown error" }));
			throw new Error(err.detail ?? "Hint generation failed");
		}
		return res.json();
	},

  /** Analyze code quality and get improvement suggestions */
  async analyzeCode(code: string, language: string, studentId?: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
    complexity: string;
    summary: string;
  }> {
    const res = await fetch(`${LLM_BASE}/analyze-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, student_id: studentId ?? null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail ?? "Code analysis failed");
    }
    return res.json();
  },

  /** Get AI debugging help for failing code */
  async debugCode(code: string, language: string, errorMessage: string, studentId?: string): Promise<{
    root_cause: string;
    fix_steps: string[];
    corrected_snippet?: string;
    explanation: string;
  }> {
    const res = await fetch(`${LLM_BASE}/debug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, error_message: errorMessage, student_id: studentId ?? null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail ?? "Debug request failed");
    }
    return res.json();
  },

  /** Get a contextual hint for a coding challenge */
  async getChallengeHint(challengeTitle: string, code: string, language: string): Promise<{ hint: string; sources: string[] }> {
    return chatApi.sendMessage(
      [{ role: "user", content: `I'm working on: "${challengeTitle}". Here's my code so far:\n\`\`\`${language}\n${code}\n\`\`\`\n\nGive me a hint to move forward without giving the full solution.` }],
      `coding challenge: ${challengeTitle}`
    ).then(r => ({ hint: r.answer, sources: r.sources }));
  },

  /** Transcribe audio blob using the backend Whisper engine */
  async transcribe(audioBlob: Blob): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const res = await fetch(`${LLM_BASE}/transcribe`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Transcription failed" }));
      throw new Error(err.detail ?? "Transcription failed");
    }
    return res.json();
  },
};
