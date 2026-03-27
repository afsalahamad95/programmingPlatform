import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { chatApi } from "../../api/chatApi";

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useAudioTranscription(stream: MediaStream | null, micEnabled: boolean) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [sttDisabled, setSttDisabled] = useState(false);
  const [inputText, setInputText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [fillerCount, setFillerCount] = useState(0);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const consecutiveErrorCountRef = useRef(0);
  const isRecordingRef = useRef(false);

  // Sync ref with state for event handlers
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalChunk += event.results[i][0].transcript;
        else interimChunk += event.results[i][0].transcript;
      }
      if (finalChunk) {
        setInputText(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + finalChunk.trim() + " ");
      }
      setInterimText(interimChunk);
    };

    recognition.onend = () => {
      if (isRecordingRef.current && micEnabled && !sttDisabled) {
        try { recognition.start(); } catch (e) { /* already started */ }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "network") {
        consecutiveErrorCountRef.current++;
        if (consecutiveErrorCountRef.current >= 3) {
          setSttDisabled(true);
          toast.error("Speech service unstable. Switching to High-Accuracy Backend Mode.");
        }
      }
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [micEnabled, sttDisabled]);

  const startRecording = useCallback(async () => {
    if (!micEnabled || !stream) {
      toast.error("Microphone not available.");
      return;
    }

    setIsRecording(true);
    setInputText("");
    setInterimText("");
    audioChunksRef.current = [];

    // Start Browser STT
    if (recognitionRef.current && !sttDisabled) {
      try { recognitionRef.current.start(); } catch (e) { /* ignore */ }
    }

    // Start MediaRecorder (Whisper Backup)
    try {
      const mimeType = ["audio/webm;codecs=opus", "audio/webm"].find(t => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsProcessingAudio(true);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 1000) {
          try {
            const resp = await chatApi.transcribe(blob);
            if (resp.text) {
              const fillers = (resp.text.match(/\b(um|uh|ah|like|you know)\b/gi) || []).length;
              setFillerCount(f => f + fillers);
              setInputText(prev => {
                  const cleaned = resp.text.trim();
                  if (prev.toLowerCase().includes(cleaned.toLowerCase().substring(0, 10))) return prev;
                  return prev + " " + cleaned;
              });
            }
          } catch (err) {
            console.error("Transcription error:", err);
          }
        }
        setIsProcessingAudio(false);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error("MediaRecorder start failed:", err);
    }
  }, [micEnabled, stream, sttDisabled]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    isProcessingAudio,
    inputText,
    setInputText,
    interimText,
    sttDisabled,
    fillerCount,
    startRecording,
    stopRecording,
  };
}
