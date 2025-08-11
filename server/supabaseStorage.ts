import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { events, eventExceptions, users, type Event, type InsertEvent, type User, type InsertUser, type EventException, type InsertEventException } from "@shared/schema";
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfDay, endOfDay, isSameDay, format } from "date-fns";
import type { IStorage } from "./storage";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

export class SupabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Event methods
  async getEvents(): Promise<Event[]> {
    const dbEvents = await db.select().from(events).orderBy(events.startDate);
    return this.expandRecurringEvents(dbEvents);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    const dbEvents = await db.select().from(events).where(
      and(
        gte(events.startDate, startDate),
        lte(events.startDate, endDate)
      )
    ).orderBy(events.startDate);
    return this.expandRecurringEvents(dbEvents, startDate, endDate);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(insertEvent).returning();
    return result[0];
  }

  async updateEvent(id: string, updateEvent: Partial<InsertEvent>): Promise<Event | undefined> {
    const result = await db.update(events).set(updateEvent).where(eq(events.id, id)).returning();
    return result[0];
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // New methods for recurring event management
  async deleteRecurringInstance(parentEventId: string, instanceDate: Date): Promise<boolean> {
    // Create an exception record to mark this instance as deleted
    await db.insert(eventExceptions).values({
      parentEventId,
      exceptionDate: instanceDate,
      type: 'deleted'
    });
    return true;
  }

  async updateRecurringInstance(parentEventId: string, instanceDate: Date, updates: Partial<InsertEvent>): Promise<Event | null> {
    // Create a new event for the modified instance
    const parentEvent = await this.getEvent(parentEventId);
    if (!parentEvent) return null;

    // Create new event with the updates
    const modifiedEvent = await db.insert(events).values({
      title: updates.title ?? parentEvent.title,
      description: updates.description ?? parentEvent.description,
      startDate: updates.startDate ?? instanceDate,
      endDate: updates.endDate ?? parentEvent.endDate,
      isRecurring: false, // Modified instances are not recurring
      recurringPattern: null,
      recurringWeeks: null,
      parentEventId,
      originalDate: instanceDate
    }).returning();

    // Create exception record
    await db.insert(eventExceptions).values({
      parentEventId,
      exceptionDate: instanceDate,
      type: 'modified',
      modifiedEventId: modifiedEvent[0].id
    });

    return modifiedEvent[0];
  }

  private async expandRecurringEvents(dbEvents: Event[], rangeStart?: Date, rangeEnd?: Date): Promise<Event[]> {
    const expandedEvents: Event[] = [];
    const now = new Date();
    const startDate = rangeStart || now;
    const endDate = rangeEnd || addMonths(now, 6); // Default 6 months ahead

    // Get all exceptions to filter out deleted/modified instances
    const exceptions = await db.select().from(eventExceptions);
    const exceptionMap = new Map<string, EventException[]>();
    exceptions.forEach(ex => {
      if (!exceptionMap.has(ex.parentEventId)) {
        exceptionMap.set(ex.parentEventId, []);
      }
      exceptionMap.get(ex.parentEventId)!.push(ex);
    });

    for (const event of dbEvents) {
      if (!event.isRecurring) {
        // Non-recurring events - add as is
        expandedEvents.push(event);
        continue;
      }

      // For recurring events, generate instances
      const eventExceptions = exceptionMap.get(event.id) || [];
      const instances = this.generateRecurringInstances(
        event, 
        startDate, 
        endDate, 
        eventExceptions
      );
      expandedEvents.push(...instances);
    }

    // Add modified instances (standalone events created from exceptions)
    const modifiedEvents = await db.select().from(events)
      .where(and(
        eq(events.isRecurring, false),
        sql`${events.parentEventId} IS NOT NULL`
      ));
    
    expandedEvents.push(...modifiedEvents);

    return expandedEvents.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  private generateRecurringInstances(
    baseEvent: Event, 
    startDate: Date, 
    endDate: Date, 
    exceptions: EventException[]
  ): Event[] {
    const instances: Event[] = [];
    const eventStart = new Date(baseEvent.startDate);
    let currentDate = new Date(Math.max(eventStart.getTime(), startDate.getTime()));
    
    // Calculate end date for recurring series
    let seriesEndDate = endDate;
    if (baseEvent.recurringWeeks && baseEvent.recurringWeeks !== 'indefinite') {
      const weeksToAdd = parseInt(baseEvent.recurringWeeks);
      const calculatedEndDate = addWeeks(eventStart, weeksToAdd);
      seriesEndDate = new Date(Math.min(calculatedEndDate.getTime(), endDate.getTime()));
    }

    const deletedDates = new Set(
      exceptions
        .filter(ex => ex.type === 'deleted')
        .map(ex => format(new Date(ex.exceptionDate), 'yyyy-MM-dd'))
    );

    const modifiedDates = new Set(
      exceptions
        .filter(ex => ex.type === 'modified')
        .map(ex => format(new Date(ex.exceptionDate), 'yyyy-MM-dd'))
    );

    while (isBefore(currentDate, seriesEndDate)) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      
      // Skip deleted instances
      if (deletedDates.has(dateKey)) {
        currentDate = this.getNextRecurrenceDate(currentDate, baseEvent.recurringPattern!);
        continue;
      }

      // Skip modified instances (they'll be added separately)
      if (modifiedDates.has(dateKey)) {
        currentDate = this.getNextRecurrenceDate(currentDate, baseEvent.recurringPattern!);
        continue;
      }

      // Create instance
      const instanceId = `${baseEvent.id}-recur-${format(currentDate, 'yyyy-MM-dd')}`;
      const timeDiff = new Date(baseEvent.endDate || baseEvent.startDate).getTime() - new Date(baseEvent.startDate).getTime();
      
      instances.push({
        ...baseEvent,
        id: instanceId,
        startDate: currentDate,
        endDate: baseEvent.endDate ? new Date(currentDate.getTime() + timeDiff) : null,
        parentEventId: baseEvent.id,
        originalDate: currentDate
      });

      currentDate = this.getNextRecurrenceDate(currentDate, baseEvent.recurringPattern!);
    }

    return instances;
  }

  private getNextRecurrenceDate(currentDate: Date, pattern: string): Date {
    switch (pattern) {
      case 'daily':
        return addDays(currentDate, 1);
      case 'weekly':
        return addWeeks(currentDate, 1);
      case 'monthly':
        return addMonths(currentDate, 1);
      case 'yearly':
        return addYears(currentDate, 1);
      default:
        return addWeeks(currentDate, 1);
    }
  }
}