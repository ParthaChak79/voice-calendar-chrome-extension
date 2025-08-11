import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { Plus, Edit, Trash2, Repeat } from "lucide-react";
import { type Event } from "@shared/schema";
import { useEvents } from "@/hooks/useEvents";

interface EventSidebarProps {
  events: Event[];
  onEventEdit: (event: Event) => void;
  onQuickAdd: (title: string) => void;
  onEventDelete?: (event: Event) => void;
}

export function EventSidebar({ events, onEventEdit, onQuickAdd, onEventDelete }: EventSidebarProps) {
  const [quickAddText, setQuickAddText] = useState("");
  const { deleteEvent } = useEvents();

  const handleQuickAdd = () => {
    if (quickAddText.trim()) {
      onQuickAdd(quickAddText.trim());
      setQuickAddText("");
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    // Check if it's a recurring event
    const isRecurringEvent = event.isRecurring || event.id.includes('-recur-');
    
    if (isRecurringEvent && onEventDelete) {
      // Use the callback to show recurring event dialog
      onEventDelete(event);
    } else {
      // Simple delete for non-recurring events
      if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
        try {
          const eventId = event.id.includes('-recur-') 
            ? event.id.split('-recur-')[0] 
            : event.id;
          await deleteEvent.mutateAsync(eventId);
        } catch (error) {
          console.error("Error deleting event:", error);
        }
      }
    }
  };

  const formatEventTime = (event: Event) => {
    const date = new Date(event.startDate);
    
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE, h:mm a');
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  // Sort events by date and get upcoming ones
  const upcomingEvents = events
    .filter(event => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10); // Show up to 10 upcoming events

  return (
    <aside className="w-80 bg-gray-50 border-r border-gray-200 p-6" data-testid="event-sidebar">
      {/* Quick Add Event */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Add</h3>
        <div className="space-y-3">
          <Input
            type="text"
            placeholder="Type or use voice: 'Lunch meeting tomorrow 1 PM'"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            data-testid="quick-add-input"
          />
          <Button
            onClick={handleQuickAdd}
            className="w-full bg-primary-700 text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors duration-200"
            data-testid="quick-add-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Upcoming Events</h3>
        
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No upcoming events</p>
            <p className="text-xs text-gray-400 mt-1">Use voice or quick add to create one</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="upcoming-events">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                data-testid={`event-card-${event.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900" data-testid={`event-title-${event.id}`}>
                      {event.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1" data-testid={`event-time-${event.id}`}>
                      {formatEventTime(event)}
                    </p>
                    {event.description && (
                      <p className="text-xs text-gray-500 mt-1" data-testid={`event-description-${event.id}`}>
                        {event.description}
                      </p>
                    )}
                    {event.isRecurring && (
                      <span className="inline-block mt-2 px-2 py-1 bg-secondary-100 text-secondary-800 text-xs rounded-full">
                        <Repeat className="w-3 h-3 inline mr-1" />
                        Recurring
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEventEdit(event)}
                      className="text-gray-400 hover:text-primary-600 p-1 h-auto"
                      data-testid={`edit-event-${event.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEvent(event)}
                      className="text-gray-400 hover:text-accent-500 p-1 h-auto"
                      data-testid={`delete-event-${event.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
