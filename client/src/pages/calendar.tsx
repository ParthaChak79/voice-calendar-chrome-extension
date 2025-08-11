import { useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { EventSidebar } from "@/components/EventSidebar";
import { VoiceInput } from "@/components/VoiceInput";
import { EventModal } from "@/components/EventModal";
import { NotificationToast } from "@/components/NotificationToast";
import { RecurringEventDialog } from "@/components/RecurringEventDialog";
import { UpcomingEventsNotification } from "@/components/UpcomingEventsNotification";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { parseVoiceCommand, generateEventFromVoiceCommand, findEventsByQuery, speakText } from "@/lib/voiceUtils";
import { type Event } from "@shared/schema";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [recurringDialog, setRecurringDialog] = useState<{
    isOpen: boolean;
    event: Event | null;
    action: 'edit' | 'delete';
  }>({
    isOpen: false,
    event: null,
    action: 'edit'
  });

  const { user, logout } = useAuth();
  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useEvents();

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
  };

  const handleEventEdit = (event: Event) => {
    // Check if it's a recurring event
    const isRecurringEvent = event.isRecurring || event.id.includes('-recur-');
    
    if (isRecurringEvent) {
      setRecurringDialog({
        isOpen: true,
        event,
        action: 'edit'
      });
    } else {
      setEditingEvent(event);
      setShowEventModal(true);
    }
  };

  const handleEventModalClose = () => {
    setShowEventModal(false);
    setEditingEvent(null);
  };

  const handleVoiceCommand = async (command: string) => {
    try {
      // Parse the voice command
      const parsedCommand = parseVoiceCommand(command);
      
      if (parsedCommand.action === 'create' && parsedCommand.title) {
        // Generate event from voice command
        const eventData = generateEventFromVoiceCommand(parsedCommand);
        
        if (eventData) {
          // Create the event
          await createEvent.mutateAsync({
            title: eventData.title,
            description: eventData.description || null,
            startDate: eventData.startDate,
            endDate: null,
            isRecurring: eventData.isRecurring,
            recurringPattern: eventData.recurringPattern || null
          });

          const message = `"${eventData.title}" has been added to your calendar`;
          setNotification({
            title: "Event Created via Voice",
            message,
            type: 'success'
          });
          speakText(`Event created: ${eventData.title}`);
        }
      } else if (parsedCommand.action === 'edit' && parsedCommand.eventQuery) {
        // Find matching events
        const matchingEvents = findEventsByQuery(events || [], parsedCommand.eventQuery);
        
        if (matchingEvents.length === 0) {
          const message = `No events found matching "${parsedCommand.eventQuery}"`;
          setNotification({
            title: "Event Not Found",
            message,
            type: 'error'
          });
          speakText(message);
          return;
        }
        
        const eventToEdit = matchingEvents[0]; // Use the most relevant match
        
        if (parsedCommand.newTitle) {
          // Edit the event title
          const isRecurringInstance = eventToEdit.id.includes('-recur-');
          const eventId = isRecurringInstance ? eventToEdit.id.split('-recur-')[0] : eventToEdit.id;
          
          await updateEvent.mutateAsync({
            id: eventId,
            data: { title: parsedCommand.newTitle }
          });
          
          const message = `Event "${eventToEdit.title}" changed to "${parsedCommand.newTitle}"`;
          setNotification({
            title: "Event Updated via Voice",
            message,
            type: 'success'
          });
          speakText(`Event updated to ${parsedCommand.newTitle}`);
        } else if (parsedCommand.dateTime?.date || parsedCommand.dateTime?.time) {
          // Reschedule the event
          const isRecurringInstance = eventToEdit.id.includes('-recur-');
          const eventId = isRecurringInstance ? eventToEdit.id.split('-recur-')[0] : eventToEdit.id;
          
          let newStartDate = new Date(eventToEdit.startDate);
          
          // Update date if provided
          if (parsedCommand.dateTime.date) {
            const newDate = new Date(parsedCommand.dateTime.date);
            newStartDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
          }
          
          // Update time if provided
          if (parsedCommand.dateTime.time) {
            const newTime = new Date(parsedCommand.dateTime.time);
            newStartDate.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
          }
          
          await updateEvent.mutateAsync({
            id: eventId,
            data: { startDate: newStartDate }
          });
          
          const message = `Event "${eventToEdit.title}" rescheduled to ${newStartDate.toLocaleDateString()} at ${newStartDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          setNotification({
            title: "Event Rescheduled via Voice",
            message,
            type: 'success'
          });
          speakText(`Event rescheduled to ${newStartDate.toLocaleDateString()} at ${newStartDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        } else {
          // Open edit modal for the event
          handleEventEdit(eventToEdit);
          speakText(`Opening edit dialog for ${eventToEdit.title}`);
        }
      } else if (parsedCommand.action === 'delete' && parsedCommand.eventQuery) {
        // Find matching events to delete
        const matchingEvents = findEventsByQuery(events || [], parsedCommand.eventQuery);
        
        if (matchingEvents.length === 0) {
          const message = `No events found matching "${parsedCommand.eventQuery}"`;
          setNotification({
            title: "Event Not Found",
            message,
            type: 'error'
          });
          speakText(message);
          return;
        }
        
        const eventToDelete = matchingEvents[0]; // Use the most relevant match
        const isRecurringInstance = eventToDelete.id.includes('-recur-');
        const eventId = isRecurringInstance ? eventToDelete.id.split('-recur-')[0] : eventToDelete.id;
        
        // Check if it's a recurring event for voice deletion
        const isRecurringEvent = eventToDelete.isRecurring || eventToDelete.id.includes('-recur-');
        
        if (isRecurringEvent) {
          setRecurringDialog({
            isOpen: true,
            event: eventToDelete,
            action: 'delete'
          });
        } else {
          // Confirm deletion via voice for non-recurring events
          if (window.confirm(`Delete "${eventToDelete.title}"? Say yes to confirm.`)) {
            await deleteEvent.mutateAsync(eventId);
            
            const message = `"${eventToDelete.title}" has been deleted from your calendar`;
            setNotification({
              title: "Event Deleted via Voice",
              message,
              type: 'success'
            });
            speakText(`Event deleted: ${eventToDelete.title}`);
          }
        }
      } else {
        let helpMessage = "Try saying something like:";
        if (parsedCommand.action === 'create') {
          helpMessage += " 'Schedule meeting tomorrow at 2 PM'";
        } else if (parsedCommand.action === 'edit') {
          helpMessage += " 'Edit meeting to lunch' or 'Change dentist appointment'";
        } else if (parsedCommand.action === 'delete') {
          helpMessage += " 'Delete meeting' or 'Remove dentist appointment'";
        } else {
          helpMessage += " 'Schedule meeting', 'Edit appointment', or 'Delete event'";
        }
        
        setNotification({
          title: "Voice Command Not Recognized",
          message: helpMessage,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Voice command error:', error);
      setNotification({
        title: "Voice Command Error",
        message: "There was an error processing your voice command",
        type: 'error'
      });
    }
  };

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ title, message, type });
  };

  const handleRecurringChoice = async (choice: 'current' | 'all') => {
    const { event, action } = recurringDialog;
    if (!event) return;

    try {
      if (action === 'edit') {
        if (choice === 'current') {
          // Edit only this occurrence - mark it for instance editing
          setEditingEvent({ ...event, isRecurringInstance: true } as any);
          setShowEventModal(true);
        } else {
          // Edit all events in series
          const baseEventId = event.id.includes('-recur-') 
            ? event.id.split('-recur-')[0] 
            : event.id;
          const baseEvent = events?.find(e => e.id === baseEventId) || event;
          
          setEditingEvent(baseEvent);
          setShowEventModal(true);
        }
      } else if (action === 'delete') {
        if (choice === 'current') {
          // Delete only this occurrence
          const isRecurringInstance = event.id.includes('-recur-');
          if (isRecurringInstance) {
            const parentEventId = event.id.split('-recur-')[0];
            const response = await fetch(`/api/events/${event.id}?instanceDate=${event.startDate}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              window.location.reload(); // Refresh to show updated events
            }
          } else {
            await deleteEvent.mutateAsync(event.id);
          }
          
          showNotification(
            "Event Deleted",
            `"${event.title}" occurrence deleted`,
            'success'
          );
        } else {
          // Delete all events in series
          const baseEventId = event.id.includes('-recur-') 
            ? event.id.split('-recur-')[0] 
            : event.id;
          await deleteEvent.mutateAsync(baseEventId);
          
          showNotification(
            "Recurring Series Deleted",
            `All "${event.title}" events deleted`,
            'success'
          );
        }
      }
    } catch (error) {
      console.error('Error handling recurring event:', error);
      showNotification(
        "Error",
        "Failed to update recurring event",
        'error'
      );
    } finally {
      setRecurringDialog({ isOpen: false, event: null, action: 'edit' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <header className="bg-primary-700 text-white px-6 py-4" data-testid="calendar-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <h1 className="text-xl font-medium">VoiceCalendar</h1>
            </div>
            
            <VoiceInput 
          onVoiceCommand={handleVoiceCommand} 
          onShowEventModal={() => setShowEventModal(true)}
        />
          </div>
        </header>

        <div className="flex">
          <EventSidebar
            events={events || []}
            onEventEdit={handleEventEdit}
            onEventDelete={(event) => {
              const isRecurringEvent = event.isRecurring || event.id.includes('-recur-');
              if (isRecurringEvent) {
                setRecurringDialog({
                  isOpen: true,
                  event,
                  action: 'delete'
                });
              }
            }}
            onQuickAdd={async (title) => {
              try {
                // Try to parse as voice command first
                const parsedCommand = parseVoiceCommand(title);
                
                if (parsedCommand.action === 'create' && parsedCommand.title) {
                  const eventData = generateEventFromVoiceCommand(parsedCommand);
                  if (eventData) {
                    await createEvent.mutateAsync({
                      title: eventData.title,
                      description: eventData.description || null,
                      startDate: eventData.startDate,
                      endDate: null,
                      isRecurring: eventData.isRecurring,
                      recurringPattern: eventData.recurringPattern || null
                    });
                  } else {
                    // Fallback to simple event creation
                    await createEvent.mutateAsync({
                      title,
                      description: null,
                      startDate: new Date(),
                      endDate: null,
                      isRecurring: false,
                      recurringPattern: null
                    });
                  }
                } else {
                  // Simple text event creation
                  await createEvent.mutateAsync({
                    title,
                    description: null,
                    startDate: new Date(),
                    endDate: null,
                    isRecurring: false,
                    recurringPattern: null
                  });
                }

                setNotification({
                  title: "Event Added",
                  message: `"${title}" added to calendar`,
                  type: "success"
                });
              } catch (error) {
                console.error("Error creating quick event:", error);
                setNotification({
                  title: "Error",
                  message: "Failed to create event. Please try again.",
                  type: "error"
                });
              }
            }}
          />
          
          <CalendarView
            selectedDate={selectedDate}
            events={events || []}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventEdit}
          />
        </div>

        {showEventModal && (
          <EventModal
            event={editingEvent}
            selectedDate={selectedDate}
            onClose={handleEventModalClose}
            onSuccess={(title) => {
              showNotification(
                editingEvent ? "Event Updated" : "Event Created",
                `"${title}" has been ${editingEvent ? 'updated' : 'added to your calendar'}`
              );
            }}
          />
        )}

        {notification && (
          <NotificationToast
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        <RecurringEventDialog
          isOpen={recurringDialog.isOpen}
          eventTitle={recurringDialog.event?.title || ""}
          action={recurringDialog.action}
          onChoice={handleRecurringChoice}
          onCancel={() => setRecurringDialog({ isOpen: false, event: null, action: 'edit' })}
        />

        <UpcomingEventsNotification events={events || []} />
      </div>
    </div>
  );
}
