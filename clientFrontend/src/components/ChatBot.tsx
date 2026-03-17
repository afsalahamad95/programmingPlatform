import React, { useState, useRef, useEffect, useCallback } from "react";
import { chatApi, ChatMessage } from "../api/chatApi";

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** Simple markdown-ish renderer for code fences and bold/italic */
function renderContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const codeBlockRe = /```[\w]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last)
      parts.push(<span key={last}>{text.slice(last, m.index)}</span>);
    parts.push(
      <pre
        key={m.index}
        className="bg-gray-900 text-green-300 rounded-lg p-3 my-2 text-xs overflow-x-auto font-mono leading-relaxed"
      >
        <code>{m[1].trim()}</code>
      </pre>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length)
    parts.push(<span key={last}>{text.slice(last)}</span>);
  return parts;
}

/* ── types ────────────────────────────────────────────────────────────────── */

interface BubbleProps {
  msg: ChatMessage;
}

function Bubble({ msg }: BubbleProps) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 group`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 shadow-md shadow-indigo-500/30 mt-0.5">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div
        className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm"
            : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
        }`}
      >
        {renderContent(msg.content)}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start mb-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 shadow-md shadow-indigo-500/30 mt-0.5">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "👋 Hi! I'm your AI programming assistant. Ask me anything — concepts, debugging, algorithms, or tips for your upcoming tests!",
};

const ChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* focus on open */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(next);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────── */}
      <button
        id="chatbot-toggle"
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full
          shadow-2xl shadow-indigo-500/40 transition-all duration-300 select-none
          ${
            open
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
          }`}
        aria-label="Toggle AI Assistant"
      >
        {open ? (
          /* X icon */
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Sparkle / chat icon */
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

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <div
        id="chatbot-panel"
        className={`fixed bottom-20 right-6 z-50 flex flex-col
          w-[360px] max-w-[calc(100vw-1.5rem)]
          bg-gray-50 rounded-2xl shadow-2xl shadow-black/20 border border-gray-200
          transition-all duration-300 origin-bottom-right overflow-hidden
          ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}`}
        style={{ height: "520px" }}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shadow-inner">
            AI
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Programming Assistant</p>
            <p className="text-xs text-indigo-200">Powered by RAG · Groq LLaMA3</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-500/50 flex-shrink-0" title="Online" />
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-0 space-y-1">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {loading && <ThinkingBubble />}
          {error && (
            <div className="mx-1 my-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              ⚠️ {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2 bg-gray-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 transition-all">
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
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white disabled:opacity-40 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm shadow-indigo-400/40"
              aria-label="Send"
            >
              <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-1.5">Shift+Enter for new line · answers grounded in your course knowledge base</p>
        </div>
      </div>
    </>
  );
};

export default ChatBot;
