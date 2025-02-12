import { useState, useCallback } from 'react';
import type { AppNotification } from '@/components/NotificationBanner';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((
    message: string,
    type: AppNotification['type'],
    txHash?: `0x${string}`
  ) => {
    const notification: AppNotification = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      type,
      txHash
    };
    setNotifications(prev => [...prev, notification]);
    return notification.id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };
}