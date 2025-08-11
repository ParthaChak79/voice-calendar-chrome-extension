import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Mic } from "lucide-react";
import { format } from "date-fns";
import { type Event } from "@shared/schema";
import { useEvents } from "@/hooks/useEvents";
import { VoiceInput } from "./VoiceInput";
import { parseVoiceCommand, generateEventFromVoiceCommand } from "@/lib/voiceUtils";

interface EventModalProps {
  event?: Event | null;
  selectedDate: Date;
  onClose: () => void;
  onSuccess: (title: string) => void;
}

export function EventModal({ event, selectedDate, onClose, onSuccess }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: format(selectedDate, "yyyy-MM-dd"),
    time: "09:00",
    isRecurring: false,
    recurringPattern: "weekly",
    recurringWeeks: "indefinite"
  });

  const { createEvent, updateEvent } = useEvents();

  useEffect(() => {
    if (event) {
      const eventDate = new Date(event.startDate);
      setFormData({
        title: event.title,
        description: event.description || "",
        date: format(eventDate, "yyyy-MM-dd"),
        time: format(eventDate, "HH:mm"),
        isRecurring: event.isRecurring || false,
        recurringPattern: event.recurringPattern || "weekly",
        recurringWeeks: event.recurringWeeks || "indefinite"
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        startDate,
        endDate: null,
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? formData.recurringPattern : null,
        recurringWeeks: formData.isRecurring ? formData.recurringWeeks : null
      };

      if (event) {
        await updateEvent.mutateAsync({ id: event.id, data: eventData });
      } else {
        await createEvent.mutateAsync(eventData);
      }

      onSuccess(formData.title);
      onClose();
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVoiceCommand = (command: string) => {
    const parsedCommand = parseVoiceCommand(command);
    
    if (parsedCommand.action === 'create' && parsedCommand.title) {
      // Fill form with voice-parsed data
      const eventData = generateEventFromVoiceCommand(parsedCommand);
      
      if (eventData) {
        setFormData(prev => ({
          ...prev,
          title: eventData.title,
          description: eventData.description || prev.description,
          date: format(eventData.startDate, "yyyy-MM-dd"),
          time: format(eventData.startDate, "HH:mm"),
          isRecurring: eventData.isRecurring,
          recurringPattern: eventData.recurringPattern || prev.recurringPattern
        }));
      }
    } else if (parsedCommand.title) {
      // Just fill the title field if we extracted a title
      setFormData(prev => ({ ...prev, title: parsedCommand.title! }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" data-testid="event-modal">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {event ? "Edit Event" : "Create New Event"}
            </h3>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <VoiceInput 
                  onVoiceCommand={handleVoiceCommand}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1"
                data-testid="close-modal-button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title
                <span className="text-xs text-gray-500 ml-2">
                  (Use voice button above to fill automatically)
                </span>
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter event title or use voice input"
                required
                data-testid="event-title-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  required
                  data-testid="event-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  required
                  data-testid="event-time-input"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Add event description..."
                data-testid="event-description-input"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => handleChange("isRecurring", checked as boolean)}
                data-testid="recurring-checkbox"
              />
              <label htmlFor="recurring" className="text-sm text-gray-700">
                Recurring event
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recurring Pattern
                  </label>
                  <Select
                    value={formData.recurringPattern}
                    onValueChange={(value) => handleChange("recurringPattern", value)}
                  >
                    <SelectTrigger data-testid="recurring-pattern-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <Select
                    value={formData.recurringWeeks}
                    onValueChange={(value) => handleChange("recurringWeeks", value)}
                  >
                    <SelectTrigger data-testid="recurring-weeks-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 weeks</SelectItem>
                      <SelectItem value="4">4 weeks</SelectItem>
                      <SelectItem value="8">8 weeks</SelectItem>
                      <SelectItem value="12">12 weeks</SelectItem>
                      <SelectItem value="24">24 weeks (6 months)</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary-700 text-white hover:bg-primary-600"
                disabled={createEvent.isPending || updateEvent.isPending}
                data-testid="save-event-button"
              >
                {createEvent.isPending || updateEvent.isPending
                  ? "Saving..."
                  : event
                  ? "Update Event"
                  : "Save Event"
                }
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
