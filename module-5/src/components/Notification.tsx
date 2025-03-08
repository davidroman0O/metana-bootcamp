import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { NotificationType } from '@/types';

interface NotificationProps {
  message: string;
  type?: NotificationType;
  duration?: number;
}

export default function Notification({ 
  message, 
  type = 'info',
  duration = 5000
}: NotificationProps) {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);
    
    return () => {
      clearTimeout(timer);
    };
  }, [duration]);
  
  if (!visible) return null;
  
  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };
  
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-md shadow-lg text-white ${getBackgroundColor()} animate-fade-in`}>
      <div className="mr-2">
        {getIcon()}
      </div>
      <div>{message}</div>
    </div>
  );
}