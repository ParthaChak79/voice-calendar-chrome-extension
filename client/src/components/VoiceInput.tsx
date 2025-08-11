import { useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceInputProps {
  onVoiceCommand: (command: string) => void;
  onShowEventModal?: () => void;
}

export function VoiceInput({ onVoiceCommand, onShowEventModal }: VoiceInputProps) {
  const [showHelp, setShowHelp] = useState(false);
  
  const {
    isRecording,
    isTranscribing,
    isSupported,
    startRecording,
    stopRecording,
    transcript,
    error
  } = useAudioRecorder({
    onTranscript: onVoiceCommand,
    onError: (error) => {
      console.error('Audio recording error:', error);
    }
  });

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setShowHelp(false);
    } else {
      // Show event modal when user clicks voice button (if callback provided)
      if (onShowEventModal && !isTranscribing) {
        onShowEventModal();
        return;
      }
      
      startRecording();
      setShowHelp(true);
    }
  };

  if (!isSupported) {
    return (
      <Button 
        disabled
        className="bg-secondary-600 text-white opacity-50 cursor-not-allowed"
        data-testid="voice-button-disabled"
      >
        <MicOff className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={toggleRecording}
        disabled={isTranscribing}
        className={`relative bg-secondary-600 hover:bg-secondary-500 text-white p-3 rounded-full transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-secondary-300 ${
          isRecording ? 'voice-active' : ''
        } ${isTranscribing ? 'opacity-75' : ''}`}
        data-testid="voice-button"
      >
        {isTranscribing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
        
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-secondary-400 animate-pulse-ring pointer-events-none" />
        )}
      </Button>

      {/* Voice Status Display */}
      {(isRecording || isTranscribing) && (
        <div className="mt-3 text-sm transition-opacity duration-300" data-testid="voice-status">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="voice-wave w-1 h-4 bg-secondary-400 rounded-full animate-voice-wave"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span>
              {isTranscribing 
                ? 'Processing with Whisper AI...' 
                : isRecording 
                ? 'Recording... Click to stop'
                : transcript || 'Try "Schedule meeting", "Edit event", or "Delete appointment"'
              }
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg" data-testid="voice-error">
          {error}
        </div>
      )}

      {/* Voice Command Help */}
      {showHelp && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs z-50 transition-all duration-300" data-testid="voice-help">
          <h4 className="font-medium text-gray-900 mb-2">Voice Commands (Powered by Whisper AI)</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• "Schedule meeting tomorrow at 3 PM"</li>
            <li>• "Add lunch appointment Friday noon"</li>
            <li>• "Create recurring standup every Monday 9 AM"</li>
            <li>• "Edit meeting to lunch"</li>
            <li>• "Delete dentist appointment"</li>
            <li>• "Remove team standup"</li>
          </ul>
          <div className="mt-2 text-xs text-gray-500 border-t pt-2">
            Click for manual event creation • Voice for quick scheduling
          </div>
        </div>
      )}
    </div>
  );
}
