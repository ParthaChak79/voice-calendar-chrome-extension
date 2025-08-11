import { type Event, type InsertEvent, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Event methods
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  // Recurring event methods
  deleteRecurringInstance?(parentEventId: string, instanceDate: Date): Promise<boolean>;
  updateRecurringInstance?(parentEventId: string, instanceDate: Date, updates: Partial<InsertEvent>): Promise<Event | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private events: Map<string, Event>;

  constructor() {
    this.users = new Map();
    this.events = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Event methods
  async getEvents(): Promise<Event[]> {
    const allEvents: Event[] = [];
    
    for (const event of Array.from(this.events.values())) {
      allEvents.push(event);
      
      // Generate recurring event instances for the next 6 months
      if (event.isRecurring && event.recurringPattern) {
        const recurringEvents = this.generateRecurringEvents(event, 6 * 30); // 6 months
        allEvents.push(...recurringEvents);
      }
    }
    
    return allEvents.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    const allEvents: Event[] = [];
    
    for (const event of Array.from(this.events.values())) {
      const eventStart = new Date(event.startDate);
      
      // Include base event if in range
      if (eventStart >= startDate && eventStart <= endDate) {
        allEvents.push(event);
      }
      
      // Include recurring instances if in range
      if (event.isRecurring && event.recurringPattern) {
        const recurringEvents = this.generateRecurringEvents(event, 365); // 1 year
        const filteredRecurring = recurringEvents.filter(recurEvent => {
          const recurStart = new Date(recurEvent.startDate);
          return recurStart >= startDate && recurStart <= endDate;
        });
        allEvents.push(...filteredRecurring);
      }
    }
    
    return allEvents.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = { 
      id,
      title: insertEvent.title,
      description: insertEvent.description || null,
      startDate: insertEvent.startDate,
      endDate: insertEvent.endDate || null,
      isRecurring: insertEvent.isRecurring || false,
      recurringPattern: insertEvent.recurringPattern || null,
      recurringWeeks: insertEvent.recurringWeeks || null,
      createdAt: new Date()
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updateEvent: Partial<InsertEvent>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) return undefined;

    const updatedEvent: Event = { ...existingEvent, ...updateEvent };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  private generateRecurringEvents(baseEvent: Event, daysAhead: number): Event[] {
    const recurringEvents: Event[] = [];
    const baseDate = new Date(baseEvent.startDate);
    
    for (let i = 1; i <= Math.floor(daysAhead / this.getRecurrenceInterval(baseEvent.recurringPattern || 'weekly')); i++) {
      const newDate = new Date(baseDate);
      
      switch (baseEvent.recurringPattern) {
        case 'daily':
          newDate.setDate(baseDate.getDate() + i);
          break;
        case 'weekly':
          newDate.setDate(baseDate.getDate() + (i * 7));
          break;
        case 'monthly':
          newDate.setMonth(baseDate.getMonth() + i);
          break;
        case 'yearly':
          newDate.setFullYear(baseDate.getFullYear() + i);
          break;
        default:
          continue;
      }
      
      recurringEvents.push({
        id: `${baseEvent.id}-recur-${i}`, // Generate unique ID for recurring instance
        title: baseEvent.title,
        description: baseEvent.description,
        startDate: newDate,
        endDate: baseEvent.endDate ? new Date(newDate.getTime() + (new Date(baseEvent.endDate).getTime() - baseDate.getTime())) : null,
        isRecurring: baseEvent.isRecurring,
        recurringPattern: baseEvent.recurringPattern,
        recurringWeeks: baseEvent.recurringWeeks,
        createdAt: baseEvent.createdAt
      });
    }
    
    return recurringEvents;
  }

  private getRecurrenceInterval(pattern?: string): number {
    switch (pattern) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'yearly': return 365;
      default: return 7;
    }
  }
}

import { SupabaseStorage } from "./supabaseStorage";

// Enhanced memory storage with recurring event support
export class EnhancedMemStorage extends MemStorage {
  private eventExceptions: Map<string, any[]> = new Map();

  async deleteRecurringInstance(parentEventId: string, instanceDate: Date): Promise<boolean> {
    // Store exception for this instance
    if (!this.eventExceptions.has(parentEventId)) {
      this.eventExceptions.set(parentEventId, []);
    }
    
    this.eventExceptions.get(parentEventId)!.push({
      exceptionDate: instanceDate,
      type: 'deleted'
    });
    
    return true;
  }

  async updateRecurringInstance(parentEventId: string, instanceDate: Date, updates: Partial<InsertEvent>): Promise<Event | null> {
    const parentEvent = await this.getEvent(parentEventId);
    if (!parentEvent) return null;

    // Create a new modified event
    const modifiedEventId = randomUUID();
    const modifiedEvent: Event = {
      id: modifiedEventId,
      title: updates.title ?? parentEvent.title,
      description: updates.description ?? parentEvent.description,
      startDate: updates.startDate ?? instanceDate,
      endDate: updates.endDate ?? parentEvent.endDate,
      isRecurring: false,
      recurringPattern: null,
      recurringWeeks: null,
      parentEventId,
      originalDate: instanceDate,
      createdAt: new Date()
    };

    this.events.set(modifiedEventId, modifiedEvent);

    // Add exception
    if (!this.eventExceptions.has(parentEventId)) {
      this.eventExceptions.set(parentEventId, []);
    }
    
    this.eventExceptions.get(parentEventId)!.push({
      exceptionDate: instanceDate,
      type: 'modified',
      modifiedEventId
    });

    return modifiedEvent;
  }

  async getEvents(): Promise<Event[]> {
    const baseEvents = Array.from(this.events.values());
    return this.expandRecurringEvents(baseEvents);
  }

  private expandRecurringEvents(baseEvents: Event[]): Event[] {
    const expandedEvents: Event[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)); // 6 months ahead

    for (const event of baseEvents) {
      if (!event.isRecurring) {
        expandedEvents.push(event);
        continue;
      }

      // Get exceptions for this event
      const exceptions = this.eventExceptions.get(event.id) || [];
      const deletedDates = new Set(
        exceptions.filter(e => e.type === 'deleted').map(e => e.exceptionDate.toDateString())
      );
      const modifiedDates = new Set(
        exceptions.filter(e => e.type === 'modified').map(e => e.exceptionDate.toDateString())
      );

      // Generate recurring instances
      const instances = this.generateRecurringInstances(event, now, endDate, deletedDates, modifiedDates);
      expandedEvents.push(...instances);
    }

    return expandedEvents.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  private generateRecurringInstances(
    baseEvent: Event, 
    startDate: Date, 
    endDate: Date, 
    deletedDates: Set<string>, 
    modifiedDates: Set<string>
  ): Event[] {
    const instances: Event[] = [];
    const eventStart = new Date(baseEvent.startDate);
    let currentDate = new Date(Math.max(eventStart.getTime(), startDate.getTime()));
    
    // Calculate series end date
    let seriesEndDate = endDate;
    if (baseEvent.recurringWeeks && baseEvent.recurringWeeks !== 'indefinite') {
      const weeksToAdd = parseInt(baseEvent.recurringWeeks);
      const calculatedEndDate = new Date(eventStart.getTime() + (weeksToAdd * 7 * 24 * 60 * 60 * 1000));
      seriesEndDate = new Date(Math.min(calculatedEndDate.getTime(), endDate.getTime()));
    }

    let iterationCount = 0;
    const maxIterations = 500; // Prevent infinite loops

    while (currentDate < seriesEndDate && iterationCount < maxIterations) {
      iterationCount++;
      
      const dateString = currentDate.toDateString();
      
      // Skip deleted or modified instances
      if (deletedDates.has(dateString) || modifiedDates.has(dateString)) {
        currentDate = this.getNextRecurrenceDate(currentDate, baseEvent.recurringPattern!);
        continue;
      }

      // Create instance
      const instanceId = `${baseEvent.id}-recur-${currentDate.getTime()}`;
      const timeDiff = baseEvent.endDate 
        ? new Date(baseEvent.endDate).getTime() - new Date(baseEvent.startDate).getTime()
        : 0;
      
      instances.push({
        ...baseEvent,
        id: instanceId,
        startDate: new Date(currentDate),
        endDate: timeDiff > 0 ? new Date(currentDate.getTime() + timeDiff) : null,
        parentEventId: baseEvent.id,
        originalDate: new Date(currentDate)
      });

      currentDate = this.getNextRecurrenceDate(currentDate, baseEvent.recurringPattern!);
    }

    return instances;
  }

  private getNextRecurrenceDate(currentDate: Date, pattern: string): Date {
    const next = new Date(currentDate);
    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setDate(next.getDate() + 7);
    }
    return next;
  }
}

// Use enhanced memory storage with recurring event support
export const storage = new EnhancedMemStorage();
