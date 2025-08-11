import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Event } from "@shared/schema";

interface CalendarViewProps {
  selectedDate: Date;
  events: Event[];
  onDateSelect: (date: Date) => void;
  onEventClick: (event: Event) => void;
}

export function CalendarView({ selectedDate, events, onDateSelect, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Add padding days for grid alignment
  const startPadding = getDay(monthStart);
  const paddingDays = Array.from({ length: startPadding }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - startPadding + i);
    return date;
  });

  const allDays = [...paddingDays, ...calendarDays];

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.startDate), date)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <main className="flex-1 p-6" data-testid="calendar-main">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-medium text-gray-900" data-testid="current-month">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              data-testid="prev-month-button"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              data-testid="next-month-button"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={goToToday}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            data-testid="today-button"
          >
            Today
          </Button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm ${view === 'month' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              data-testid="month-view-button"
            >
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('week')}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              data-testid="week-view-button"
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('day')}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              data-testid="day-view-button"
            >
              Day
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" data-testid="calendar-grid">
        {/* Calendar Header Days */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {weeks.map((week, weekIndex) =>
            week.map((date, dayIndex) => {
              const dayEvents = getEventsForDate(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isTodayDate = isToday(date);
              const isSelected = isSameDay(date, selectedDate);

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`min-h-32 p-2 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                    isCurrentMonth
                      ? isTodayDate
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : isSelected
                        ? 'bg-primary-100'
                        : 'hover:bg-primary-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                  } ${dayIndex === 6 ? 'border-r-0' : ''}`}
                  onClick={() => onDateSelect(date)}
                  data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
                >
                  <span
                    className={`text-sm font-medium ${
                      isCurrentMonth
                        ? isTodayDate
                          ? 'text-primary-900'
                          : 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {format(date, 'd')}
                  </span>
                  
                  {isTodayDate && isCurrentMonth && (
                    <div className="text-xs text-primary-600 mt-1">Today</div>
                  )}

                  {/* Event indicators */}
                  {dayEvents.length > 0 && (
                    <div className="mt-1 space-y-1 max-h-20 overflow-y-auto">
                      {dayEvents.slice(0, 4).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`text-xs px-2 py-1 rounded truncate cursor-pointer hover:shadow-sm transition-all ${
                            event.isRecurring
                              ? 'bg-secondary-500 text-white border-l-2 border-secondary-700'
                              : event.title.toLowerCase().includes('meeting')
                              ? 'bg-blue-500 text-white border-l-2 border-blue-700'
                              : event.title.toLowerCase().includes('lunch') || event.title.toLowerCase().includes('dinner')
                              ? 'bg-orange-500 text-white border-l-2 border-orange-700'
                              : 'bg-primary-500 text-white border-l-2 border-primary-700'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          data-testid={`event-${event.id}`}
                          title={`${event.title} - ${format(new Date(event.startDate), 'h:mm a')}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate flex-1">{event.title}</span>
                            <span className="ml-1 opacity-75 text-xs">
                              {format(new Date(event.startDate), 'h:mm')}
                            </span>
                          </div>
                          {event.isRecurring && (
                            <div className="text-xs opacity-75 mt-0.5">
                              <span className="inline-block w-3 h-3 mr-1">↻</span>
                              {event.recurringPattern}
                            </div>
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 4 && (
                        <div className="text-xs text-gray-500 px-2 cursor-pointer hover:text-gray-700" 
                             onClick={() => onDateSelect(date)}>
                          +{dayEvents.length - 4} more events
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
