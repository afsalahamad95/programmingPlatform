import { useState, useCallback, useRef, useEffect } from "react";

export function useUserMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const refreshStream = useCallback(async () => {
    stopTracks();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled,
        audio: true, // Always request audio but we can mute it
      });
      
      // Apply initial mic state
      newStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
      
      streamRef.current = newStream;
      setStream(newStream);
      setCameraError(null);
      return newStream;
    } catch (err: any) {
      console.error("Media access error:", err);
      setCameraError(err.message || "Failed to access camera/mic");
      setCameraEnabled(false);
      return null;
    }
  }, [cameraEnabled, micEnabled, stopTracks]);

  // Handle toggles
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = micEnabled));
    }
  }, [micEnabled, stream]);

  useEffect(() => {
    refreshStream();
    return () => stopTracks();
  }, [cameraEnabled]); // Only refresh full stream on camera toggle for simplicity

  return {
    stream,
    micEnabled,
    setMicEnabled,
    cameraEnabled,
    setCameraEnabled,
    cameraError,
    refreshStream,
  };
}
