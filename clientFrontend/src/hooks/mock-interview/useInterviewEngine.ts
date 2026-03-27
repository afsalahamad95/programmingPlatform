import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { chatApi, ChatMessage } from "../../api/chatApi";

export interface ParsedFeedback {
  chartData: { subject: string; score: number; fullMark: number }[];
  strengths: string[];
  weaknesses: string[];
  verdict: string;
}

export function useInterviewEngine() {
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [complexity, setComplexity] = useState(1);
  const [depthOfAnalysis, setDepthOfAnalysis] = useState(10);
  const [parsedFeedback, setParsedFeedback] = useState<ParsedFeedback | null>(null);
  const [isAiInterviewerSpeaking, setIsAiInterviewerSpeaking] = useState(false);

  // TTS Logic
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name.includes("Google") || v.name.includes("Premium")) || voices[0];
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setIsAiInterviewerSpeaking(true);
    utterance.onend = () => setIsAiInterviewerSpeaking(false);
    utterance.onerror = () => setIsAiInterviewerSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleStart = useCallback(() => {
    setIsStarted(true);
    setIsFinished(false);
    setParsedFeedback(null);
    setComplexity(1);
    setDepthOfAnalysis(10);
    const intro = "Hello! I am your AI Interviewer. To begin, could you briefly introduce yourself and highlight a recent project you are proud of?";
    setMessages([{ role: "assistant", content: intro }]);
    setTimeout(() => speak(intro), 1000);
  }, [speak]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    setIsTyping(true);
    try {
      const nextComplexity = Math.min(10, complexity + (text.length > 50 ? 1 : 0.5));
      setComplexity(nextComplexity);
      setDepthOfAnalysis(Math.round((nextComplexity / 10) * 100));

      const contextHint = `You are a senior technical interviewer. \nDEPTH: ${nextComplexity.toFixed(1)}/10. \nADAPTIVE RULES:\n1. Depth < 3: Fundamentals.\n2. Depth 3-7: Intermediate/STAR.\n3. Depth > 7: High-scale/Design.\n4. Call out flaws.\n5. End with ONE follow-up.`;
      
      const response = await chatApi.sendMessage(updatedMessages, contextHint);
      setMessages(prev => [...prev, { role: "assistant", content: response.answer }]);
      speak(response.answer);
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("AI connection lost. Reverting to manual mode.");
    } finally {
      setIsTyping(false);
    }
  }, [messages, complexity, speak]);

  const handleEnd = useCallback(async () => {
    setIsStarted(false);
    setIsFinished(true);
    setIsTyping(true);
    
    const evalPrompt: ChatMessage = { 
      role: "user", 
      content: `The interview is over. Evaluate my performance. Return ONLY raw JSON: {"scores": {"Comm": 80, "Problem": 70}, "strengths": [], "weaknesses": [], "verdict": ""}`
    };

    try {
      const resp = await chatApi.sendMessage([...messages, evalPrompt], "Output strictly JSON, no markdown.");
      let jsonStr = resp.answer.replace(/```json|```/g, "").trim();
      const data = JSON.parse(jsonStr);
      setParsedFeedback({
        chartData: Object.keys(data.scores).map(k => ({ subject: k, score: data.scores[k], fullMark: 100 })),
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        verdict: data.verdict
      });
    } catch (err) {
      console.error("Evaluation failed", err);
    } finally {
      setIsTyping(false);
    }
  }, [messages]);

  return {
    isStarted,
    isFinished,
    messages,
    isTyping,
    complexity,
    depthOfAnalysis,
    parsedFeedback,
    isAiInterviewerSpeaking,
    handleStart,
    handleEnd,
    sendMessage,
  };
}
