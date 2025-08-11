import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X, Clock } from "lucide-react";
import { format, isToday, isTomorrow, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { type Event } from "@shared/schema";

interface UpcomingEventsNotificationProps {
  events: Event[];
}

export function UpcomingEventsNotification({ events }: UpcomingEventsNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      const upcoming = events.filter(event => {
        const eventDate = new Date(event.startDate);
        const minutesUntil = differenceInMinutes(eventDate, now);
        
        // Show notification for events:
        // - Starting in next 15 minutes
        // - Starting in next hour (but not shown yet)
        // - Starting tomorrow (morning reminder)
        return (
          minutesUntil > 0 && 
          (minutesUntil <= 15 || 
           (minutesUntil <= 60 && minutesUntil % 30 === 0) ||
           (isTomorrow(eventDate) && now.getHours() === 8 && now.getMinutes() < 5))
        );
      }).slice(0, 3); // Show max 3 upcoming events

      if (upcoming.length > 0 && JSON.stringify(upcoming) !== JSON.stringify(upcomingEvents)) {
        setUpcomingEvents(upcoming);
        setShowNotification(true);
      }
    };

    // Check every minute
    checkUpcomingEvents();
    const interval = setInterval(checkUpcomingEvents, 60000);

    return () => clearInterval(interval);
  }, [events, upcomingEvents]);

  const formatTimeUntil = (eventDate: Date) => {
    const now = new Date();
    const minutesUntil = differenceInMinutes(eventDate, now);
    const hoursUntil = differenceInHours(eventDate, now);
    const daysUntil = differenceInDays(eventDate, now);

    if (minutesUntil <= 15) {
      return `in ${minutesUntil} minutes`;
    } else if (hoursUntil < 24) {
      return `in ${hoursUntil} hours`;
    } else if (daysUntil === 1) {
      return `tomorrow at ${format(eventDate, 'h:mm a')}`;
    } else {
      return format(eventDate, 'MMM d, h:mm a');
    }
  };

  const getNotificationColor = (eventDate: Date) => {
    const minutesUntil = differenceInMinutes(eventDate, new Date());
    if (minutesUntil <= 15) return "border-red-200 bg-red-50";
    if (minutesUntil <= 60) return "border-orange-200 bg-orange-50";
    return "border-blue-200 bg-blue-50";
  };

  if (!showNotification || upcomingEvents.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm" data-testid="upcoming-events-notification">
      <div className={`bg-white rounded-lg shadow-lg border-2 p-4 ${getNotificationColor(new Date(upcomingEvents[0].startDate))}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Upcoming Events</h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotification(false)}
            className="p-1 h-auto"
            data-testid="close-notification"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="flex items-start space-x-3 p-2 rounded bg-white bg-opacity-50">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {event.title}
                </p>
                <p className="text-xs text-gray-600">
                  {formatTimeUntil(new Date(event.startDate))}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Click to dismiss • Notifications will continue
          </p>
        </div>
      </div>
    </div>
  );
}