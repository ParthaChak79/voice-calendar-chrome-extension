import { parseNaturalLanguageDate, type ParsedDateTime } from "./dateUtils";

export interface VoiceCommand {
  action: 'create' | 'edit' | 'delete' | 'unknown';
  title?: string;
  description?: string;
  dateTime?: ParsedDateTime;
  isRecurring?: boolean;
  recurringPattern?: string;
  originalText: string;
  eventQuery?: string; // For finding events to edit/delete
  newTitle?: string; // For editing event title
}

export function parseVoiceCommand(transcript: string): VoiceCommand {
  const lowercaseTranscript = transcript.toLowerCase().trim();
  
  // Determine action
  let action: VoiceCommand['action'] = 'unknown';
  
  if (
    lowercaseTranscript.includes('schedule') ||
    lowercaseTranscript.includes('add') ||
    lowercaseTranscript.includes('create') ||
    lowercaseTranscript.includes('book')
  ) {
    action = 'create';
  } else if (
    lowercaseTranscript.includes('edit') ||
    lowercaseTranscript.includes('modify') ||
    lowercaseTranscript.includes('change') ||
    lowercaseTranscript.includes('update')
  ) {
    action = 'edit';
  } else if (
    lowercaseTranscript.includes('delete') ||
    lowercaseTranscript.includes('remove') ||
    lowercaseTranscript.includes('cancel')
  ) {
    action = 'delete';
  }

  // Parse date and time
  const dateTime = parseNaturalLanguageDate(transcript);

  // Extract title/event name
  let title: string | undefined;
  
  let eventQuery: string | undefined;
  let newTitle: string | undefined;

  if (action === 'create') {
    // Remove command words and extract the event title
    let cleanedText = transcript
      .replace(/\b(schedule|add|create|book)\b/gi, '')
      .trim();
    
    // Find the first occurrence of time/date indicators and stop there
    const stopWords = /\b(at|on|for|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:?\d{0,2}\s*(am|pm|a\.m\.|p\.m\.)|noon|midnight)\b/i;
    const match = cleanedText.match(stopWords);
    
    if (match && match.index !== undefined) {
      cleanedText = cleanedText.substring(0, match.index).trim();
    }
    
    // Additional cleanup for remaining time references
    cleanedText = cleanedText
      .replace(/\b\d{1,2}:?\d{0,2}\s*(am|pm|a\.m\.|p\.m\.)\b/gi, '')
      .replace(/\b(noon|midnight)\b/gi, '')
      .trim();
    
    if (cleanedText) {
      title = cleanedText;
    }
  } else if (action === 'edit') {
    // Parse edit commands - support both title changes and rescheduling
    if (transcript.toLowerCase().includes(' to ')) {
      const parts = transcript.toLowerCase().split(' to ');
      if (parts.length >= 2) {
        eventQuery = parts[0].replace(/\b(edit|modify|change|update)\b/gi, '').trim();
        
        // Check if the "to" part contains a title or a time/date
        const toPart = parts[1].trim();
        
        // Try to parse the "to" part as a date/time
        const possibleDateTime = parseNaturalLanguageDate(toPart);
        
        if (possibleDateTime?.date || possibleDateTime?.time) {
          // This is a reschedule command like "change meeting to 3 PM tomorrow"
          // Don't set newTitle, the dateTime will be used for rescheduling
        } else {
          // This is a title change like "change meeting to lunch"
          newTitle = toPart;
        }
      }
    } else {
      // Simple edit command like "edit meeting" or "reschedule meeting tomorrow at 3 PM"
      // Try to extract both the event and new time
      let cleanedText = transcript.replace(/\b(edit|modify|change|update|reschedule)\b/gi, '').trim();
      
      // Look for time/date indicators to separate event name from new time
      const timeIndicators = /\b(at|on|for|to|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:?\d{0,2}\s*(am|pm|a\.m\.|p\.m\.)|noon|midnight)\b/i;
      const timeMatch = cleanedText.match(timeIndicators);
      
      if (timeMatch) {
        // Split at the first time indicator
        const timeIndex = timeMatch.index!;
        eventQuery = cleanedText.substring(0, timeIndex).trim();
      } else {
        eventQuery = cleanedText;
      }
    }
  } else if (action === 'delete') {
    // Parse delete commands like "delete meeting" or "remove dentist appointment"
    eventQuery = transcript
      .replace(/\b(delete|remove|cancel)\b/gi, '')
      .trim();
  }

  // Check for recurring patterns
  let isRecurring = false;
  let recurringPattern: string | undefined;
  
  if (
    lowercaseTranscript.includes('every') ||
    lowercaseTranscript.includes('recurring') ||
    lowercaseTranscript.includes('repeat')
  ) {
    isRecurring = true;
    
    if (lowercaseTranscript.includes('every day') || lowercaseTranscript.includes('daily')) {
      recurringPattern = 'daily';
    } else if (
      lowercaseTranscript.includes('every week') || 
      lowercaseTranscript.includes('weekly') ||
      lowercaseTranscript.includes('every monday') ||
      lowercaseTranscript.includes('every tuesday') ||
      lowercaseTranscript.includes('every wednesday') ||
      lowercaseTranscript.includes('every thursday') ||
      lowercaseTranscript.includes('every friday')
    ) {
      recurringPattern = 'weekly';
    } else if (lowercaseTranscript.includes('every month') || lowercaseTranscript.includes('monthly')) {
      recurringPattern = 'monthly';
    } else if (lowercaseTranscript.includes('every year') || lowercaseTranscript.includes('yearly')) {
      recurringPattern = 'yearly';
    } else {
      recurringPattern = 'weekly'; // Default
    }
  }

  return {
    action,
    title,
    description: action === 'create' ? `Created via voice command: "${transcript}"` : undefined,
    dateTime,
    isRecurring,
    recurringPattern,
    originalText: transcript,
    eventQuery,
    newTitle
  };
}

export function generateEventFromVoiceCommand(command: VoiceCommand): {
  title: string;
  description?: string;
  startDate: Date;
  isRecurring: boolean;
  recurringPattern?: string;
} | null {
  if (command.action !== 'create' || !command.title) {
    return null;
  }

  let startDate = new Date();
  
  // Use parsed date/time if available
  if (command.dateTime?.date) {
    startDate = new Date(command.dateTime.date);
    
    if (command.dateTime.time) {
      const time = command.dateTime.time;
      startDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
    }
  } else if (command.dateTime?.time) {
    // Only time specified, use today
    const time = command.dateTime.time;
    startDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
  }

  return {
    title: command.title,
    description: `Created via voice command: "${command.originalText}"`,
    startDate,
    isRecurring: command.isRecurring || false,
    recurringPattern: command.recurringPattern
  };
}

// Helper function to find events by query
export function findEventsByQuery(events: any[], query: string): any[] {
  if (!events || !query.trim()) return [];
  
  const lowerQuery = query.toLowerCase().trim();
  
  return events.filter(event => {
    const title = event.title?.toLowerCase() || '';
    const description = event.description?.toLowerCase() || '';
    
    // Check if query words are found in title or description
    const queryWords = lowerQuery.split(/\s+/);
    return queryWords.some(word => 
      title.includes(word) || description.includes(word)
    );
  }).sort((a, b) => {
    // Sort by relevance - exact title matches first
    const aTitle = a.title?.toLowerCase() || '';
    const bTitle = b.title?.toLowerCase() || '';
    
    if (aTitle.includes(lowerQuery) && !bTitle.includes(lowerQuery)) return -1;
    if (!aTitle.includes(lowerQuery) && bTitle.includes(lowerQuery)) return 1;
    
    // Then by date (most recent first)
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });
}

// Text-to-speech for voice feedback
export function speakText(text: string): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.7;
    
    // Use a more natural voice if available
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Natural')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    speechSynthesis.speak(utterance);
  }
}

export function getVoiceCommandExamples(): string[] {
  return [
    "Schedule meeting tomorrow at 3 PM",
    "Add lunch appointment Friday noon",
    "Create recurring standup every Monday 9 AM",
    "Book doctor appointment next Tuesday 2:30 PM",
    "Schedule team review today at 4 PM",
    "Add birthday party Saturday at 6 PM",
    "Create weekly one-on-one every Thursday 10 AM",
    "Schedule call with client tomorrow morning",
  ];
}
