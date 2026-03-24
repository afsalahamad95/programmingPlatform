import { useState, useEffect, useRef } from 'react';
import { 
  Bot, Video, Mic, MicOff, VideoOff, Play, Square, MessageSquare, 
  Activity, User, X, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, ChatMessage } from '../api/chatApi';

// Type definitions for Web Speech API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const MockInterview = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState(''); // New state for real-time dictation
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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

  // Handle Speech Recognition Toggle
  const toggleSpeechRecognition = () => {
    if (!SpeechRecognition) {
      toast.error("Your browser doesn't support speech transcription (Try Chrome/Edge).");
      return;
    }
    if (!micEnabled) {
      toast.error("Please enable your microphone first.");
      return;
    }
    
    if (isRecordingRef.current) {
      isRecordingRef.current = false; // Synchronous update to avoid race condition with onend
      setIsRecording(false);
      setInterimText('');
      recognitionRef.current?.stop();
      toast.success("Voice recording paused");
    } else {
      isRecordingRef.current = true;
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
        toast.success("Recording started... Speak now.");
      } catch (err) {
        console.error("Could not start recognition", err);
        // Fallback for double starts
        recognitionRef.current?.stop();
      }
    }
  };

  // Initialize camera if enabled
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      setCameraError(null);
      if (cameraEnabled && navigator.mediaDevices) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micEnabled });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraEnabled]); // Note: removing micEnabled to prevent camera flicker when toggling mic

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleStart = async () => {
    setIsStarted(true);
    setIsFinished(false);
    setFeedback(null);
    toast.success("Interview Started!");
    
    const initMsg: ChatMessage = { 
      role: 'assistant', 
      content: 'Hello! I am your AI Interviewer. I will be assessing your technical and behavioral skills today. To begin, could you briefly introduce yourself and highlight a recent project you are proud of?' 
    };
    setMessages([initMsg]);
  };

  const handleEnd = async () => {
    setIsStarted(false);
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    
    toast.success("Interview Ended. Analyzing your performance...");
    setIsFinished(true);
    setIsTyping(true);
    
    // Request a performance review from the LLM based on the conversation history
    const evalRequest: ChatMessage[] = [
      ...messages,
      { 
        role: "user", 
        content: "The interview is now over. Based on my answers, please provide a comprehensive performance review. Highlight my strengths, note any weaknesses, and suggest specific areas for improvement. Format the output with clear headings." 
      }
    ];

    try {
      const response = await chatApi.sendMessage(evalRequest, "You are a senior technical recruiter evaluating a candidate post-interview.");
      setFeedback(response.answer);
    } catch (err) {
      console.warn("LLM Chat API failed, falling back to mock feedback. Backend might be down.", err);
      // Fallback if backend is down
      setTimeout(() => {
        setFeedback("### Interview Performance Review\\n\\n**Strengths:**\\nYou communicated your ideas clearly and demonstrated a solid understanding of fundamental software engineering principles.\\n\\n**Areas for Improvement:**\\nTry to dive deeper into the technical trade-offs of the solutions you propose. You can also improve by formulating responses using the STAR format (Situation, Task, Action, Result) to make your examples highly structured.\\n\\n**Verdict:**\\nGood effort! Keep practicing your system design explanations.");
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
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
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
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-slide-up shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <CheckCircle className="w-64 h-64 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            Interview Performance Review
          </h2>
          
          <div className="prose prose-invert prose-indigo max-w-none relative z-10 space-y-4">
             {isTyping && !feedback ? (
               <div className="flex items-center gap-3 text-indigo-400 animate-pulse text-lg">
                 <Bot className="w-6 h-6 animate-spin" /> Gathering feedback insights...
               </div>
             ) : (
               <div className="bg-black/20 p-6 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed text-gray-300">
                  {feedback?.replace(/\\n/g, '\n')}
               </div>
             )}
          </div>
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
              <div className={`absolute bottom-6 right-6 w-32 h-40 sm:w-48 sm:h-64 bg-gray-900 rounded-2xl border-2 transition-colors duration-500 overflow-hidden shadow-2xl flex flex-col items-center justify-center ${isTyping ? 'border-indigo-500' : 'border-white/10'}`}>
                <Bot className={`w-12 h-12 ${isTyping ? 'text-indigo-400 animate-bounce' : isStarted ? 'text-indigo-300' : 'text-gray-600'}`} />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded-md">
                    {isTyping ? 'Thinking...' : 'AI Interviewer'}
                  </span>
                </div>
              </div>

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
