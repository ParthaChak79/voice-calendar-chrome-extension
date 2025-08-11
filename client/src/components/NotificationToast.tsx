import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, X } from "lucide-react";

interface NotificationToastProps {
  title: string;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function NotificationToast({ title, message, type, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show animation
    setIsVisible(true);

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  const iconColor = type === 'success' ? 'text-secondary-500' : 'text-red-500';

  return (
    <div 
      className={`fixed top-4 right-4 z-50 max-w-sm transition-all duration-300 transform ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
      data-testid="notification-toast"
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900" data-testid="notification-title">
              {title}
            </p>
            <p className="mt-1 text-sm text-gray-600" data-testid="notification-message">
              {message}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="ml-4 text-gray-400 hover:text-gray-600 p-1 h-auto"
            data-testid="close-notification-button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
