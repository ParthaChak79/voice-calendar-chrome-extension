import { format, parse, isValid, addDays, addWeeks, addMonths, addYears, startOfDay } from "date-fns";

export interface ParsedDateTime {
  date?: Date;
  time?: Date;
  isValid: boolean;
  originalText: string;
}

export function parseNaturalLanguageDate(input: string): ParsedDateTime {
  const lowercaseInput = input.toLowerCase();
  let date: Date | undefined;
  let time: Date | undefined;

  // Today, tomorrow, yesterday
  const today = startOfDay(new Date());
  
  if (lowercaseInput.includes('today')) {
    date = today;
  } else if (lowercaseInput.includes('tomorrow')) {
    date = addDays(today, 1);
  } else if (lowercaseInput.includes('yesterday')) {
    date = addDays(today, -1);
  }

  // Day names (next Monday, Tuesday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = dayNames.find(day => lowercaseInput.includes(day));
  
  if (dayMatch && !date) {
    const targetDayIndex = dayNames.indexOf(dayMatch);
    const currentDayIndex = today.getDay();
    let daysToAdd = targetDayIndex - currentDayIndex;
    
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Next occurrence
    }
    
    date = addDays(today, daysToAdd);
  }

  // Time parsing
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/gi;
  const timeMatch = timeRegex.exec(input);
  
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || '0');
    const meridiem = timeMatch[3]?.toLowerCase();
    
    if (meridiem && (meridiem.includes('pm') || meridiem.includes('p.m.')) && hours !== 12) {
      hours += 12;
    } else if (meridiem && (meridiem.includes('am') || meridiem.includes('a.m.')) && hours === 12) {
      hours = 0;
    }
    
    time = new Date();
    time.setHours(hours, minutes, 0, 0);
  }

  // Common time phrases
  if (lowercaseInput.includes('noon') || lowercaseInput.includes('12pm')) {
    time = new Date();
    time.setHours(12, 0, 0, 0);
  } else if (lowercaseInput.includes('midnight') || lowercaseInput.includes('12am')) {
    time = new Date();
    time.setHours(0, 0, 0, 0);
  }

  return {
    date,
    time,
    isValid: !!(date || time),
    originalText: input
  };
}

export function createDateTimeFromParts(dateStr?: string, timeStr?: string): Date {
  const baseDate = dateStr ? parse(dateStr, 'yyyy-MM-dd', new Date()) : new Date();
  
  if (timeStr) {
    const timeParts = timeStr.split(':');
    baseDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
  }
  
  return baseDate;
}

export function getRecurringDates(startDate: Date, pattern: string, count: number = 10): Date[] {
  const dates: Date[] = [startDate];
  
  for (let i = 1; i < count; i++) {
    let nextDate: Date;
    
    switch (pattern.toLowerCase()) {
      case 'daily':
        nextDate = addDays(startDate, i);
        break;
      case 'weekly':
        nextDate = addWeeks(startDate, i);
        break;
      case 'monthly':
        nextDate = addMonths(startDate, i);
        break;
      case 'yearly':
        nextDate = addYears(startDate, i);
        break;
      default:
        nextDate = addWeeks(startDate, i); // Default to weekly
    }
    
    dates.push(nextDate);
  }
  
  return dates;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 0) {
    return 'Past event';
  } else if (diffInMinutes < 60) {
    return `In ${diffInMinutes} minutes`;
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `In ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `In ${days} day${days > 1 ? 's' : ''}`;
  }
}
