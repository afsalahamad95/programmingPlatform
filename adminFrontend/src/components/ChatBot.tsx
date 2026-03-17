import React, { useState, useRef, useEffect, useCallback } from "react";
import { chatApi, ChatMessage } from "../api/chatApi";

/* ── helpers ──────────────────────────────────────────────────────────────── */

function renderContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const codeBlockRe = /```[\w]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{text.slice(last, m.index)}</span>);
    parts.push(
      <pre key={m.index} className="bg-gray-900 text-green-300 rounded-lg p-3 my-2 text-xs overflow-x-auto font-mono leading-relaxed">
        <code>{m[1].trim()}</code>
      </pre>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);
  return parts;
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mr-2 shadow-md mt-0.5">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
        isUser
          ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-sm"
          : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
      }`}>
        {renderContent(msg.content)}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start mb-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mr-2 shadow-md mt-0.5">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

/* ── tabs ─────────────────────────────────────────────────────────────────── */

type Tab = "chat" | "kb";

/* ── main component ───────────────────────────────────────────────────────── */

const WELCOME: ChatMessage = {
  role: "assistant",
  content: "👋 Hi Admin! I'm your AI assistant. I can answer questions *and* you can add documents to my knowledge base from the **KB** tab.",
};

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // KB state
  const [kbText, setKbText] = useState("");
  const [kbLoading, setKbLoading] = useState(false);
  const [kbStatus, setKbStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open && tab === "chat") setTimeout(() => inputRef.current?.focus(), 120); }, [open, tab]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setChatError(null);
    setLoading(true);
    try {
      const res = await chatApi.sendMessage(next);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleIngest = async () => {
    const lines = kbText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setKbLoading(true);
    setKbStatus(null);
    try {
      const res = await chatApi.ingest(lines);
      setKbStatus({ ok: true, msg: res.message });
      setKbText("");
    } catch (e: unknown) {
      setKbStatus({ ok: false, msg: e instanceof Error ? e.message : "Ingest failed" });
    } finally {
      setKbLoading(false);
    }
  };

  return (
    <>
      {/* Trigger */}
      <button
        id="chatbot-toggle"
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl shadow-purple-500/40 transition-all duration-300 select-none
          ${open
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
          }`}
        aria-label="Toggle AI Assistant"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            <span className="text-sm font-semibold tracking-wide">AI Assistant</span>
          </>
        )}
      </button>

      {/* Panel */}
      <div
        id="chatbot-panel"
        className={`fixed bottom-20 right-6 z-50 flex flex-col
          w-[380px] max-w-[calc(100vw-1.5rem)]
          bg-gray-50 rounded-2xl shadow-2xl shadow-black/20 border border-gray-200
          transition-all duration-300 origin-bottom-right overflow-hidden
          ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}`}
        style={{ height: "560px" }}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">AI</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Admin AI Assistant</p>
            <p className="text-xs text-pink-200">RAG · Groq LLaMA3 · ChromaDB</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Online" />
        </div>

        {/* tabs */}
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
          {(["chat", "kb"] as Tab[]).map((t) => (
            <button
              key={t}
              id={`chatbot-tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "chat" ? "💬 Chat" : "📚 Knowledge Base"}
            </button>
          ))}
        </div>

        {/* chat tab */}
        {tab === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-0">
              {messages.map((m, i) => <Bubble key={i} msg={m} />)}
              {loading && <ThinkingBubble />}
              {chatError && (
                <div className="mx-1 my-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">⚠️ {chatError}</div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-gray-100 bg-white">
              <div className="flex items-end gap-2 bg-gray-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-purple-400 transition-all">
                <textarea
                  ref={inputRef}
                  id="chatbot-input"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything… (Enter to send)"
                  disabled={loading}
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-28 leading-relaxed disabled:opacity-50"
                  style={{ minHeight: "24px" }}
                />
                <button
                  id="chatbot-send"
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white disabled:opacity-40 hover:from-purple-500 hover:to-pink-500 transition-all shadow-sm"
                  aria-label="Send"
                >
                  <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-1.5">Shift+Enter for new line</p>
            </div>
          </>
        )}

        {/* KB tab */}
        {tab === "kb" && (
          <div className="flex-1 flex flex-col px-4 py-4 gap-3 overflow-y-auto">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Add to Knowledge Base</p>
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                Paste text below — each line becomes a searchable chunk in the RAG vector store. The chatbot will use this to answer student questions.
              </p>
            </div>
            <textarea
              id="kb-ingest-input"
              value={kbText}
              onChange={(e) => setKbText(e.target.value)}
              placeholder={"Paste course material, FAQs, or notes here…\n\nOne paragraph per line works best."}
              rows={10}
              disabled={kbLoading}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-400 bg-white disabled:opacity-50 leading-relaxed min-h-[160px]"
            />
            {kbStatus && (
              <div className={`px-3 py-2.5 rounded-xl text-sm ${kbStatus.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                {kbStatus.ok ? "✅ " : "⚠️ "}{kbStatus.msg}
              </div>
            )}
            <button
              id="kb-ingest-btn"
              onClick={handleIngest}
              disabled={kbLoading || !kbText.trim()}
              className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold disabled:opacity-40 hover:from-purple-500 hover:to-pink-500 transition-all shadow-md shadow-purple-500/30"
            >
              {kbLoading ? "Ingesting…" : "📥 Ingest into Knowledge Base"}
            </button>
            <p className="text-[10px] text-gray-400 text-center">Documents are stored in ChromaDB and immediately available for RAG retrieval.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatBot;
