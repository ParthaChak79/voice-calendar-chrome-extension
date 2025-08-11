import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderOptions {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcript: string;
  error: string | null;
}

export function useAudioRecorder({ 
  onTranscript, 
  onError 
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if audio recording is supported
  const isSupported = typeof navigator !== 'undefined' && 
                     'mediaDevices' in navigator && 
                     'getUserMedia' in navigator.mediaDevices &&
                     typeof MediaRecorder !== 'undefined';

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = 'Audio recording is not supported in this browser';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setError(null);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        try {
          setIsTranscribing(true);
          
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm;codecs=opus' 
          });

          // Send to Whisper API
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
          }

          const result = await response.json();
          
          if (result.success && result.transcript) {
            setTranscript(result.transcript);
            onTranscript(result.transcript);
          } else {
            throw new Error('No transcript received');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to transcribe audio';
          setError(errorMsg);
          onError?.(errorMsg);
        } finally {
          setIsTranscribing(false);
          
          // Clean up stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsRecording(false);
    }
  }, [isSupported, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    isTranscribing,
    isSupported,
    startRecording,
    stopRecording,
    transcript,
    error,
  };
}