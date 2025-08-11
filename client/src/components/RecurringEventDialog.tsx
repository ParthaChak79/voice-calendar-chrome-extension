import { Button } from "@/components/ui/button";
import { Calendar, CalendarDays } from "lucide-react";

interface RecurringEventDialogProps {
  isOpen: boolean;
  eventTitle: string;
  action: 'edit' | 'delete';
  onChoice: (choice: 'current' | 'all') => void;
  onCancel: () => void;
}

export function RecurringEventDialog({ 
  isOpen, 
  eventTitle, 
  action, 
  onChoice, 
  onCancel 
}: RecurringEventDialogProps) {
  if (!isOpen) return null;

  const actionText = action === 'edit' ? 'Edit' : 'Delete';
  const actionVerb = action === 'edit' ? 'editing' : 'deleting';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" data-testid="recurring-event-dialog">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {actionText} Recurring Event
          </h3>
          
          <p className="text-gray-600 mb-6">
            "{eventTitle}" is a recurring event. What would you like to do?
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => onChoice('current')}
              className="w-full flex items-center justify-start space-x-3 p-4 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200"
              variant="outline"
              data-testid="edit-current-only"
            >
              <Calendar className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">This event only</div>
                <div className="text-sm text-blue-700">
                  Only {actionVerb} this specific occurrence
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => onChoice('all')}
              className="w-full flex items-center justify-start space-x-3 p-4 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200"
              variant="outline"
              data-testid="edit-all-events"
            >
              <CalendarDays className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">All events in series</div>
                <div className="text-sm text-orange-700">
                  {actionText} all recurring occurrences
                </div>
              </div>
            </Button>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="ghost"
              onClick={onCancel}
              data-testid="cancel-recurring-dialog"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}