import { Mic, MicOff, Video, VideoOff, MessageSquare, Square } from "lucide-react";

interface ControlPanelProps {
  micEnabled: boolean;
  setMicEnabled: (v: boolean) => void;
  cameraEnabled: boolean;
  setCameraEnabled: (v: boolean) => void;
  isRecording: boolean;
  isStarted: boolean;
  toggleRecording: () => void;
  showChat: boolean;
  setShowChat: (v: boolean) => void;
}

export function ControlPanel({
  micEnabled,
  setMicEnabled,
  cameraEnabled,
  setCameraEnabled,
  isRecording,
  isStarted,
  toggleRecording,
  showChat,
  setShowChat,
}: ControlPanelProps) {
  return (
    <div className="flex items-center gap-4 bg-black/70 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl transition-opacity">
      <button
        onClick={() => setMicEnabled(!micEnabled)}
        className={`p-3 rounded-full transition-all ${
          micEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-300"
        }`}
        title="Toggle Microphone"
      >
        {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>

      <button
        onClick={() => setCameraEnabled(!cameraEnabled)}
        className={`p-3 rounded-full transition-all ${
          cameraEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-300"
        }`}
        title="Toggle Camera"
      >
        {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>

      <div className="w-px h-8 bg-white/20 mx-2" />

      <button
        onClick={toggleRecording}
        disabled={!isStarted}
        className={`px-6 py-2 rounded-xl transition-all font-bold flex items-center gap-2 border ${
          isRecording
            ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
            : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-50"
        }`}
      >
        {isRecording ? (
          <>
            <Square className="w-4 h-4 fill-current" /> Stop Dictation
          </>
        ) : (
          <>
            <MessageSquare className="w-4 h-4" /> Voice Dictation
          </>
        )}
      </button>

      <button
        onClick={() => setShowChat(!showChat)}
        className={`ml-2 text-[10px] font-black uppercase tracking-tighter transition-colors ${
          showChat ? "text-indigo-400" : "text-gray-500 hover:text-white"
        }`}
      >
        {showChat ? "Hide Chat" : "Show Chat"}
      </button>
    </div>
  );
}
