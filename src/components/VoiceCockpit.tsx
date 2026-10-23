import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  Wifi,
  WifiOff,
  Activity,
  AlertCircle,
  Headphones,
  CheckCircle,
} from 'lucide-react';

interface VoiceCockpitProps {
  onClose?: () => void;
}

export const VoiceCockpit: React.FC<VoiceCockpitProps> = ({ onClose }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to open Flight Deck Voice Channel');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: 'Voice Cockpit online. Press Start Voice Session to speak with your patient AZ-900 coach.',
    },
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // PCM float to 16-bit PCM Base64 converter
  const pcmToBase64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Base64 24kHz PCM to AudioBuffer player
  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextOutRef.current) return;
    const ctx = audioContextOutRef.current;

    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;

      setIsSpeaking(true);
      source.onended = () => {
        if (ctx.currentTime >= nextStartTimeRef.current - 0.05) {
          setIsSpeaking(false);
        }
      };
    } catch (e) {
      console.error('Audio chunk decoding error:', e);
    }
  };

  const startVoiceSession = async () => {
    setErrorMsg(null);
    setStatusMessage('Connecting to Gemini 3.8 Live API channel...');

    try {
      // 1. Setup Web Audio contexts
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      // 2. Setup WebSocket connection to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatusMessage('Radio Channel Active • Initializing microphone...');

        // 3. Request user microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          mediaStreamRef.current = stream;

          const source = audioContextInRef.current!.createMediaStreamSource(stream);
          const processor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = processor;

          source.connect(processor);
          processor.connect(audioContextInRef.current!.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const base64 = pcmToBase64(inputData);
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };

          setIsRecording(true);
          setStatusMessage('Live Voice Linked! Speak naturally to your AZ-900 coach.');
        } catch (micErr: any) {
          setErrorMsg('Microphone access denied. Please grant microphone permissions in browser.');
          stopVoiceSession();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.audio) {
            playAudioChunk(data.audio);
          }
          if (data.text) {
            setTranscriptHistory((prev) => [
              ...prev,
              { role: 'model', text: data.text },
            ]);
          }
          if (data.interrupted) {
            // User interrupted model speech
            nextStartTimeRef.current = 0;
            setIsSpeaking(false);
          }
          if (data.error) {
            setErrorMsg(data.error);
          }
        } catch (e) {
          console.error('Error handling live message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket live voice error:', e);
        setErrorMsg('Live API connection failed. Check server status.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
        setIsSpeaking(false);
        setStatusMessage('Voice channel closed');
      };
    } catch (err: any) {
      console.error('Error starting live session:', err);
      setErrorMsg(err.message || 'Failed to start Live API session');
    }
  };

  const stopVoiceSession = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextInRef.current && audioContextInRef.current.state !== 'closed') {
      audioContextInRef.current.close();
    }
    if (audioContextOutRef.current && audioContextOutRef.current.state !== 'closed') {
      audioContextOutRef.current.close();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setStatusMessage('Voice channel offline');
  };

  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  const sendPresetPrompt = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
      setTranscriptHistory((prev) => [...prev, { role: 'user', text }]);
    }
  };

  return (
    <div className="bg-[#0B1A2F] border border-sky-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-950 border border-sky-700/80 flex items-center justify-center text-sky-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Live Voice Cockpit</h2>
              <span className="text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full">
                Gemini 3.8 Live API
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Real-time bi-directional voice study session</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={() => {
              stopVoiceSession();
              onClose();
            }}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800"
          >
            Close Cockpit
          </button>
        )}
      </div>

      {/* Connection Indicator Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-teal-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-slate-500" />
          )}
          <span className={isConnected ? 'text-teal-300 font-semibold' : 'text-slate-400'}>
            {statusMessage}
          </span>
        </div>

        {isSpeaking && (
          <div className="flex items-center gap-1.5 text-sky-400 animate-pulse font-semibold">
            <Volume2 className="w-4 h-4" />
            <span>Coach Speaking...</span>
          </div>
        )}
      </div>

      {/* Central Visualizer & Action Trigger */}
      <div className="py-8 text-center space-y-6">
        <div className="relative inline-block">
          {/* Animated Glow Rings when recording */}
          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
          )}

          <button
            onClick={isRecording ? stopVoiceSession : startVoiceSession}
            className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
              isRecording
                ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-950/60 ring-4 ring-rose-500/30'
                : 'bg-gradient-to-tr from-sky-500 to-teal-400 text-slate-950 shadow-sky-950/60 hover:brightness-110 ring-4 ring-sky-500/30'
            }`}
          >
            {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            <span className="text-[10px] font-bold font-mono mt-1">
              {isRecording ? 'Disconnect' : 'Start Radio'}
            </span>
          </button>
        </div>

        <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
          {isRecording
            ? 'Channel open! Speak naturally into your microphone. Ask questions or answer the coach aloud.'
            : 'Click the button above to open the real-time audio connection. Audio flows through 16kHz PCM to Gemini Live.'}
        </p>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Suggested Spoken Verbal Drills */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <span className="text-xs text-slate-400 font-mono">Quick Verbal Radio Drills:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sendPresetPrompt('Coach, explain the difference between CapEx and OpEx in 30 seconds.')}
            disabled={!isConnected}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:border-sky-500 disabled:opacity-40"
          >
            "Explain CapEx vs OpEx"
          </button>
          <button
            onClick={() => sendPresetPrompt('What is the difference between Availability Zones and Region Pairs?')}
            disabled={!isConnected}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:border-sky-500 disabled:opacity-40"
          >
            "Availability Zones vs Region Pairs"
          </button>
          <button
            onClick={() => sendPresetPrompt('Quiz me on the Shared Responsibility Model.')}
            disabled={!isConnected}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sky-300 hover:border-sky-500 disabled:opacity-40"
          >
            "Quiz me on Shared Responsibility"
          </button>
        </div>
      </div>
    </div>
  );
};
