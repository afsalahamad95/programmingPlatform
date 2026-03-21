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
};
