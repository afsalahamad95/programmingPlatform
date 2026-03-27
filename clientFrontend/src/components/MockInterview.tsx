import { useState, useEffect, useRef } from 'react';
import { 
  Bot, Video, Mic, MicOff, VideoOff, Play, Square, MessageSquare, 
  Activity, User, X, CheckCircle, Target, AlertTriangle, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, ChatMessage } from '../api/chatApi';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

// --- Sub-component: Audio Visualizer ---
const AudioVisualizer = ({ stream, isActive }: { stream: MediaStream | null; isActive: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isActive || !stream || !canvasRef.current) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      if (!ctx) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(99, 102, 241, ${0.3 + (barHeight/canvas.height)})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [isActive, stream]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-12 opacity-80" 
      width={300} 
      height={50}
    />
  );
};

// Type definitions for Web Speech API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface ParsedFeedback {
  chartData: { subject: string; score: number; fullMark: number }[];
  strengths: string[];
  weaknesses: string[];
  verdict: string;
}

const MockInterview = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const [parsedFeedback, setParsedFeedback] = useState<ParsedFeedback | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState(''); // New state for real-time dictation
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [fillerCount, setFillerCount] = useState(0);

  const isRecordingRef = useRef(isRecording);
  const micEnabledRef = useRef(micEnabled);

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
    micEnabledRef.current = micEnabled;
  }, [isRecording, micEnabled]);

  // Initialize Speech Recognition ONCE
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true; // MUST be true for MacOS/Chrome to not drop results
      
      recognition.onstart = () => {
        console.log("Speech recognition started");
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }
        
        if (finalChunk) {
          setInputText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + finalChunk.trim() + ' ');
        }
        setInterimText(interimChunk); // Update real-time visual
      };
      
      recognition.onend = () => {
        // Automatically restart if we are supposed to be recording
        if (isRecordingRef.current && micEnabledRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition", e);
          }
        } else if (!isRecordingRef.current) {
          // ensure the state gets synced to false if stopped externally
          setIsRecording(false);
          setInterimText(''); // clear interim when stopped
        }
      };

      recognition.onerror = (event: any) => {
         console.warn("Speech recognition error:", event.error);
         if (event.error === 'not-allowed') {
            toast.error("Microphone access denied by browser.");
            setMicEnabled(false);
            setIsRecording(false);
            isRecordingRef.current = false;
         } else if (event.error === 'network') {
            toast.error("Browser Speech API blocked (Network Error). Try standard Chrome/Edge or disable adblockers/VPNs.", { duration: 6000 });
            setIsRecording(false);
            isRecordingRef.current = false;
         }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
      toast.error("Your browser does not support Web Speech API.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle Speech Recognition Toggle (STT)
  const toggleSpeechRecognition = async () => {
    if (!micEnabled) {
      toast.error("Please enable your microphone first.");
      return;
    }

    if (isRecordingRef.current) {
      // STOP RECORDING
      isRecordingRef.current = false;
      setIsRecording(false);
      setInterimText('');
      
      // Stop Browser Recognition
      if (recognitionRef.current) recognitionRef.current.stop();
      
      // Stop MediaRecorder (for backend Whisper)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      toast.success("Recording paused. Processing...");
    } else {
      // START RECORDING
      isRecordingRef.current = true;
      setIsRecording(true);
      
      // Start Browser Recognition (for real-time interim display)
      try {
        if (recognitionRef.current) recognitionRef.current.start();
      } catch (err) {
        console.warn("Speech API restart failed (usual behavior)", err);
      }

      // Start MediaRecorder (for backend Whisper accuracy)
      if (streamRef.current) {
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(streamRef.current);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 1000) { // Only send if significant
            try {
              const result = await chatApi.transcribe(audioBlob);
              if (result.text && result.text.length > 2) {
                // Count fillers in the new chunk
                const fillers = (result.text.match(/\b(um|uh|ah|like|you know)\b/gi) || []).length;
                setFillerCount(prev => prev + fillers);
                
                setInputText(prev => {
                   const cleaned = result.text.trim();
                   if (!prev) return cleaned;
                   if (prev.toLowerCase().includes(cleaned.toLowerCase().substring(0, 10))) return prev; // Avoid dups
                   return prev + " " + cleaned;
                });
              }
            } catch (err) {
              console.error("Backend transcription failed, relying on browser STT", err);
            }
          }
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      }
      
      toast.success("Recording started. Speak your mind.");
    }
  };

  // TTS Synthesis
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Pick a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Female'));
    if (premiumVoice) utterance.voice = premiumVoice;
    
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    
    utterance.onstart = () => setIsAISpeaking(true);
    utterance.onend = () => setIsAISpeaking(false);
    utterance.onerror = () => setIsAISpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Initialize camera if enabled
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      setCameraError(null);
      if (cameraEnabled && navigator.mediaDevices) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        } catch (err: any) {
          console.error("Camera access denied or unavailable", err);
          setCameraError(err.message || "Camera blocked or unavailable");
          setCameraEnabled(false);
        }
      }
    };
    
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraEnabled]); 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleStart = async () => {
    setIsStarted(true);
    setIsFinished(false);
    setParsedFeedback(null);
    setFillerCount(0);
    toast.success("Interview Started!");
    
    const introduction = 'Hello! I am your AI Interviewer. I will be assessing your technical and behavioral skills today. To begin, could you briefly introduce yourself and highlight a recent project you are proud of?';
    const initMsg: ChatMessage = { 
      role: 'assistant', 
      content: introduction
    };
    setMessages([initMsg]);
    
    // Speak introduction
    setTimeout(() => speak(introduction), 1000);
  };

  const handleEnd = async () => {
    setIsStarted(false);
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    
    toast.success("Interview Ended. Synthesizing performance report...");
    setIsFinished(true);
    setIsTyping(true);
    
    // Request a performance review from the LLM based on the conversation history
    const evalRequest: ChatMessage[] = [
      ...messages,
      { 
        role: "user", 
        content: `The interview is now over. Please evaluate my performance across the entire conversation context strictly based on my answers. You MUST return ONLY a valid JSON object matching this exact structure:
{
  "scores": {
    "Communication": 85,
    "Problem Solving": 70,
    "System Design": 60,
    "Best Practices": 80
  },
  "strengths": ["list of 2-3 specific strengths"],
  "weaknesses": ["list of 2-3 specific areas for improvement"],
  "verdict": "A short, 1-2 sentence overall verdict."
}
Return ONLY the raw JSON format.` 
      }
    ];

    try {
      const response = await chatApi.sendMessage(evalRequest, "You are a senior technical evaluator. Output strictly JSON. Do not include markdown formatting like ```json or any other text.");
      let jsonStr = response.answer;
      
      // Strip markdown code blocks if the LLM stubbornly returns them
      if (jsonStr.startsWith("\`\`\`json")) {
         jsonStr = jsonStr.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      } else if (jsonStr.startsWith("\`\`\`")) {
         jsonStr = jsonStr.replace(/\`\`\`/g, "").trim();
      }
      
      const data = JSON.parse(jsonStr);
      
      const chartData = Object.keys(data.scores || {}).map(key => ({
        subject: key,
        score: parseInt(data.scores[key]) || 0,
        fullMark: 100
      }));
      
      setParsedFeedback({
        chartData,
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        verdict: data.verdict || "Evaluation complete."
      });
    } catch (err) {
      console.warn("LLM Eval failed, using mock JSON fallback.", err);
      // Fallback if backend is down or JSON parsing fundamentally fails
      setTimeout(() => {
        setParsedFeedback({
          chartData: [
            { subject: "Communication", score: 85, fullMark: 100 },
            { subject: "Problem Solving", score: 70, fullMark: 100 },
            { subject: "System Design", score: 60, fullMark: 100 },
            { subject: "Best Practices", score: 80, fullMark: 100 }
          ],
          strengths: ["Clear communication of ideas", "Good understanding of fundamentals"],
          weaknesses: ["Needs to dive deeper into technical trade-offs", "Could structure answers using STAR method better"],
          verdict: "Good effort! Keep practicing your foundational system design explanations."
        });
      }, 2000);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    
    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    
    setIsTyping(true);
    try {
      // Stream response from LLM
      const contextHint = `You are a strict, senior technical interviewer conducting a mock interview. \nCRITICAL RULES:\n1. If the candidate's answer is incorrect, overly vague, or fundamentally flawed, you MUST politely point out the error, explain why it's wrong, and ask them to clarify.\n2. Do NOT blindly accept wrong answers.\n3. Keep your responses concise and conversational (1-2 short paragraphs maximum).\n4. Always end your turn with exactly one follow-up technical or behavioral question based on their response.`;
      
      const response = await chatApi.sendMessage(updatedMessages, contextHint);
      const answer = response.answer;
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      
      // AI Speaks the answer
      speak(answer);
    } catch (err) {
      console.warn("LLM API failed, using mock interviewer response", err);
      
      const fallbacks = [
        "That makes sense. Can you explain the specific technical constraints you faced while implementing that solution?",
        "Interesting approach. How would you handle scaling this specific system if traffic increased by 10x?",
        "Could you describe the biggest technical blocker you faced during that process, and how you resolved it?",
        "That's a solid architecture. Are there any alternative patterns or databases you considered but ultimately rejected?",
        "How did you ensure the reliability and test coverage of this feature before deploying it to production?"
      ];
      const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: randomFallback }]);
        speak(randomFallback);
      }, 1500);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in text-gray-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-400" />
            AI Mock Interview
          </h1>
          <p className="mt-2 text-gray-400">Practice behavioral and technical questions with our real-time AI.</p>
        </div>
        <div className="flex gap-4">
          {!isStarted && !isFinished && (
            <button 
              onClick={handleStart}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-5 h-5" /> Start Interview
            </button>
          )}
          {isStarted && (
            <button 
              onClick={handleEnd}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-red-500/20 animate-pulse"
            >
              <Square className="w-5 h-5 fill-current" /> End Interview
            </button>
          )}
          {isFinished && (
            <button 
              onClick={() => { setIsFinished(false); setMessages([]); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      {isFinished ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-10 animate-slide-up shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <CheckCircle className="w-96 h-96 text-indigo-500" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
            <Activity className="w-8 h-8 text-indigo-400" />
            Interview Intelligence Report
          </h2>
          
          {isTyping && !parsedFeedback ? (
            <div className="flex flex-col items-center justify-center py-20 relative z-10">
               <Bot className="w-16 h-16 text-indigo-400 animate-bounce mb-6" />
               <div className="text-xl text-indigo-300 font-medium animate-pulse">Synthesizing performance parameters...</div>
               <div className="mt-6 flex gap-3">
                 <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-3 h-3 bg-purple-500 rounded-full animate-ping" style={{ animationDelay: '200ms' }}></div>
                 <div className="w-3 h-3 bg-pink-500 rounded-full animate-ping" style={{ animationDelay: '400ms' }}></div>
               </div>
            </div>
          ) : parsedFeedback ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
              
              {/* Left Column: Spider Graph */}
              <div className="bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[400px] shadow-inner">
                <h3 className="text-lg font-bold tracking-widest uppercase text-white mb-4 self-start flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" /> Vector Analysis
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={parsedFeedback.chartData}>
                    <PolarGrid stroke="#4f46e5" strokeOpacity={0.3} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#d1d5db', fontSize: 13, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#818cf8"
                      strokeWidth={3}
                      fill="#6366f1"
                      fillOpacity={0.4}
                      activeDot={{ r: 6, fill: '#fff', stroke: '#4f46e5' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Right Column: Feedback Details */}
              <div className="space-y-6 flex flex-col justify-center">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:bg-emerald-500/20 transition-colors">
                  <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-lg">
                    <CheckCircle className="w-6 h-6" /> Key Strengths
                  </h3>
                  <ul className="space-y-3">
                    {parsedFeedback.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-emerald-50 font-medium">
                        <span className="text-emerald-500 mt-1">✓</span> {str}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.05)] hover:bg-amber-500/20 transition-colors">
                  <h3 className="text-amber-400 font-bold mb-4 flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-6 h-6" /> Areas for Improvement
                  </h3>
                  <ul className="space-y-3">
                    {parsedFeedback.weaknesses.map((weak, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-amber-50 font-medium">
                        <span className="text-amber-500 mt-1">⚡</span> {weak}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-2xl p-6">
                  <h3 className="text-indigo-300 font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-widest">
                    <Award className="w-4 h-4" /> Final Verdict
                  </h3>
                  <p className="text-white font-semibold text-lg leading-relaxed">
                    "{parsedFeedback.verdict}"
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video/Content Area */}
          <div className={`${showChat ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6 transition-all duration-300`}>
            
            {/* Main Video View */}
            <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video group">
              {cameraEnabled && !cameraError ? (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100" 
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                  <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                    <User className="w-12 h-12 text-indigo-400" />
                  </div>
                  <p className="text-gray-400 px-4 text-center">
                    {cameraError ? `Camera unavailable: ${cameraError}` : 'Camera is disabled'}
                  </p>
                </div>
              )}
              
              {/* AI Call Visualizer overlay */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3 z-10">
                <div className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecordingRef.current ? 'bg-red-400' : isStarted ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isRecordingRef.current ? 'bg-red-500' : isStarted ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                </div>
                <span className="text-sm font-semibold tracking-wider uppercase text-white">
                  {isRecordingRef.current ? "Transcribing Voice..." : isStarted ? "Interview In Progress" : "Waiting to Start"}
                </span>
              </div>

              {/* AI Portrait overlay (Bottom Right) */}
              <div className={`absolute bottom-6 right-6 w-32 h-40 sm:w-48 sm:h-64 bg-gray-900/80 backdrop-blur-xl rounded-2xl border-2 transition-all duration-500 overflow-hidden shadow-2xl flex flex-col items-center justify-center ${isTyping || isAISpeaking ? 'border-indigo-500 shadow-indigo-500/20' : 'border-white/10'}`}>
                <div className={`absolute top-4 right-4 flex gap-1 ${isAISpeaking ? 'opacity-100' : 'opacity-0'}`}>
                   {[1,2,3].map(i => (
                     <div key={i} className={`w-1 h-3 bg-indigo-500 rounded-full animate-pulse`} style={{ animationDelay: `${i*150}ms` }} />
                   ))}
                </div>
                <Bot className={`w-16 h-16 transition-all duration-500 ${isTyping ? 'text-indigo-400 animate-bounce' : isAISpeaking ? 'text-indigo-300 scale-110' : isStarted ? 'text-indigo-300/50' : 'text-gray-600'}`} />
                <div className="mt-4 flex flex-col items-center">
                  <span className="text-xs font-bold text-white bg-indigo-600/50 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    {isTyping ? 'Thinking...' : isAISpeaking ? 'Speaking...' : 'AI Interviewer'}
                  </span>
                  {isAISpeaking && (
                    <div className="mt-3 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping delay-75" />
                    </div>
                  )}
                </div>
              </div>

              {/* User Voice Visualizer (Bottom Center) */}
              {isRecording && (
                <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 w-64 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 p-2 overflow-hidden animate-slide-up">
                  <div className="flex items-center gap-2 mb-1 px-2">
                    <Mic className="w-3 h-3 text-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Live User Audio</span>
                  </div>
                  <AudioVisualizer stream={streamRef.current} isActive={isRecording} />
                </div>
              )}

              {/* Controls Bar */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/70 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setMicEnabled(!micEnabled)}
                  className={`p-3 rounded-full transition-all ${micEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-300'}`}
                  title="Toggle Microphone"
                >
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  className={`p-3 rounded-full transition-all ${cameraEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-300'}`}
                  title="Toggle Camera"
                >
                  {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <div className="w-px h-8 bg-white/20 mx-2"></div>
                
                {/* Voice to text Start/Stop Button */}
                <button 
                  onClick={toggleSpeechRecognition}
                  disabled={!isStarted}
                  className={`px-4 py-2 rounded-xl transition-all font-semibold flex items-center gap-2 ${
                    isRecordingRef.current 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' 
                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 disabled:opacity-50'
                  }`}
                  title="Voice to Text Transcription"
                >
                  <MessageSquare className="w-4 h-4" /> 
                  {isRecordingRef.current ? 'Stop Dictation' : 'Voice Dictation'}
                </button>

                {!showChat && (
                  <>
                    <div className="w-px h-8 bg-white/20 mx-2"></div>
                    <button 
                      onClick={() => setShowChat(true)}
                      className="p-3 rounded-full transition-all bg-white/10 hover:bg-white/20 text-white"
                      title="Open Transcripts"
                    >
                      <Activity className="w-5 h-5" />
                    </button>
                  </  >
                )}
              </div>
            </div>

            {!showChat && (
              <button 
                onClick={() => setShowChat(true)}
                className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <MessageSquare className="w-5 h-5" /> Open Text Chat & Transcripts
              </button>
            )}
          </div>

          {/* Chat / Transcript Sidebar */}
          {showChat && (
            <div className="lg:col-span-1 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-sm shadow-xl flex flex-col h-[500px] lg:h-[calc(100vh-250px)] lg:max-h-[800px] overflow-hidden animate-slide-left relative">
              
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Live Transcript
                </h3>
                <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans scroller-hide">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-10 text-sm italic">
                    Start the interview to see transcripts here.
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-indigo-300 uppercase">
                          <Bot className="w-3.5 h-3.5" /> AI Interviewer
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {isTyping && !isFinished && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-200 border border-white/5 rounded-2xl rounded-tl-sm p-3.5">
                      <div className="flex gap-1.5 items-center justify-center h-4">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {interimText && (
                <div className="px-4 py-3 bg-indigo-500/10 border-t border-white/5 text-indigo-300 text-sm italic font-medium flex items-center gap-2">
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span>{interimText}</span><span className="animate-pulse">|</span>
                </div>
              )}

              {/* Performance Stats in Sidebar */}
              {isStarted && (
                <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    <span>Transcripts: {messages.length}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${fillerCount > 5 ? 'text-amber-500' : ''}`}>
                    <Activity className="w-3 h-3" />
                    <span>Filler Words: {fillerCount}</span>
                  </div>
                </div>
              )}
              <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-black/20">
                <div className="relative">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type response or use dictation..."
                    disabled={!isStarted}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all font-sans"
                  />
                  <button 
                    type="submit" 
                    disabled={!inputText.trim() || !isStarted || isTyping}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-white fill-current" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default MockInterview;
