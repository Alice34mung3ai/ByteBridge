import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';

interface AudioTranscriberProps {
  onTranscriptionComplete: (text: string) => void;
  buttonLabel?: string;
}

export const AudioTranscriber: React.FC<AudioTranscriberProps> = ({
  onTranscriptionComplete,
  buttonLabel,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Convert Blob to base64
        setIsTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];

          try {
            const response = await fetch('/api/coach/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: 'audio/webm',
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.transcription) {
                onTranscriptionComplete(data.transcription);
              }
            }
          } catch (err) {
            console.error('Audio transcription error:', err);
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone permission error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isTranscribing}
      title={isRecording ? 'Click to finish speaking' : 'Speak to transcribe with Gemini 3.5'}
      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0 ${
        isRecording
          ? 'bg-rose-600 text-white animate-pulse shadow-rose-950/60'
          : isTranscribing
          ? 'bg-slate-800 text-slate-400 border border-slate-700'
          : 'bg-sky-950/80 hover:bg-sky-900 border border-sky-700 text-sky-300'
      }`}
    >
      {isTranscribing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
          <span>Transcribing...</span>
        </>
      ) : isRecording ? (
        <>
          <Square className="w-3.5 h-3.5 fill-white" />
          <span>Stop Dictating</span>
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5 text-sky-400" />
          <span>{buttonLabel || 'Dictate Voice'}</span>
        </>
      )}
    </button>
  );
};
