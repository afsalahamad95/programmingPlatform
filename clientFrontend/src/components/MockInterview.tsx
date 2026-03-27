import { useState, useRef, useEffect } from "react";
import { User, Play, Bot } from "lucide-react";

// Hooks
import { useUserMedia } from "../hooks/mock-interview/useUserMedia";
import { useAudioTranscription } from "../hooks/mock-interview/useAudioTranscription";
import { useInterviewEngine } from "../hooks/mock-interview/useInterviewEngine";

// Components
import { InterviewerFeed } from "./mock-interview/InterviewerFeed";
import { ControlPanel } from "./mock-interview/ControlPanel";
import { InterviewFeedback } from "./mock-interview/InterviewFeedback";
import { VoiceVisualizer } from "./mock-interview/VoiceVisualizer";

export default function MockInterview() {
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Media Layer
  const { 
    stream, micEnabled, setMicEnabled, cameraEnabled, setCameraEnabled, cameraError 
  } = useUserMedia();

  // 2. Transcription Layer
  const {
    isRecording, isProcessingAudio, inputText, setInputText, interimText, startRecording, stopRecording
  } = useAudioTranscription(stream, micEnabled);

  // 3. Interview Brain
  const {
    isStarted, isFinished, messages, isTyping, complexity, depthOfAnalysis, 
    parsedFeedback, isAiInterviewerSpeaking, handleStart, handleEnd, sendMessage
  } = useInterviewEngine();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  if (isFinished && parsedFeedback) {
    return (
      <div className="max-w-7xl mx-auto p-6 animate-fade-in">
        <InterviewFeedback feedback={parsedFeedback} onRetry={handleStart} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in text-gray-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-400" />
            AI Interview <span className="text-indigo-500/50 text-sm font-black tracking-widest uppercase">Nova</span>
          </h1>
          <p className="mt-1 text-gray-400 text-sm">Adaptive technical assessment via real-time vector analysis.</p>
        </div>
        
        {!isStarted && (
          <button 
            onClick={handleStart}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
          >
            <Play className="w-5 h-5" /> Initialize Session
          </button>
        )}

        {isStarted && (
          <button 
            onClick={handleEnd}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-red-500/20"
          >
            Terminate Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: AI & User Feeds */}
        <div className={`${showChat ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-8 transition-all duration-500`}>
          
          {/* AI Feed */}
          <InterviewerFeed 
            isTyping={isTyping}
            isAiSpeaking={isAiInterviewerSpeaking}
            isStarted={isStarted}
            complexity={complexity}
            depthOfAnalysis={depthOfAnalysis}
            statusText={isProcessingAudio ? "AI Analyzing Audio..." : isRecording ? "Transcribing Voice..." : isStarted ? "Synchronized" : "Ready"}
          />

          {/* User Preview & Controls */}
          <div className="relative group">
            <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
               {cameraEnabled && !cameraError && stream ? (
                 <video 
                   autoPlay playsInline muted 
                   ref={(el) => { if(el) el.srcObject = stream; }}
                   className="w-full h-full object-cover transform -scale-x-100" 
                 />
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                    <User className="w-16 h-16 text-gray-700" />
                    <span className="mt-4 text-gray-600 text-xs uppercase font-bold tracking-widest">Feed Offline</span>
                 </div>
               )}

               {/* Visualizer Overlay */}
               {isRecording && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-64 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 p-2 animate-slide-up">
                  <VoiceVisualizer stream={stream} isActive={isRecording} />
                </div>
               )}

               {/* Center Controls */}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                 <ControlPanel 
                    micEnabled={micEnabled}
                    setMicEnabled={setMicEnabled}
                    cameraEnabled={cameraEnabled}
                    setCameraEnabled={setCameraEnabled}
                    isRecording={isRecording}
                    isStarted={isStarted}
                    toggleRecording={toggleRecording}
                    showChat={showChat}
                    setShowChat={setShowChat}
                 />
               </div>
            </div>
          </div>
        </div>

        {/* Right: Chat / Transcription Log */}
        {showChat && (
          <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-3xl flex flex-col h-[700px] shadow-2xl animate-slide-left">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Interaction Log</span>
              {isTyping && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {interimText && (
                <div className="flex justify-end opacity-50">
                  <div className="max-w-[85%] p-3 rounded-2xl bg-indigo-900/30 text-xs italic text-indigo-200">
                    {interimText}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(inputText); setInputText(''); }}
              className="p-4 border-t border-white/10"
            >
              <div className="relative">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isRecording ? "Listening..." : "Type your response..."}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-white transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
