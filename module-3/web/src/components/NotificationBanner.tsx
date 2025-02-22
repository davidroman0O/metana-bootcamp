import React from 'react';
import { AlertCircle, CheckCircle2, Timer, X, Info } from 'lucide-react';
import { LoadingMessage, CooldownMessage } from './RotatingHourGlass';

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  txHash?: `0x${string}`;
}

interface NotificationBannerProps {
  txHash: `0x${string}` | null;
  countdown: number;
  initialized: boolean;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  errorMessage?: string;
  onDismissError?: () => void;
  notifications: AppNotification[];
  onDismissNotification: (id: string) => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  txHash,
  countdown,
  initialized,
  isError,
  isLoading,
  isSuccess,
  errorMessage,
  onDismissError,
  notifications,
  onDismissNotification,
}) => {
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Timer className="h-5 w-5 text-amber-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    if (countdown > 0) return 'bg-amber-50';
    if (txHash && isSuccess) return 'bg-green-50';
    if (txHash && isLoading) return 'bg-blue-50';
    return 'bg-gray-50';
  };

  // Create an error notification if there's an error
  const allNotifications = [...notifications];
  if (errorMessage || isError) {
    allNotifications.unshift({
      id: 'error',
      message: errorMessage || 'The transaction could not be completed. Please try again.',
      type: 'error',
      txHash: txHash || undefined
    });
  }

  return (
    <>
      {/* Stackable Notifications Container - pointer-events-none */}
      <div className="fixed inset-x-0 bottom-0 z-50 space-y-4 pb-14 pointer-events-none">
        {allNotifications.map((notification) => (
          <div key={notification.id} className="flex justify-center px-4">
            {/* Individual notification container - restore pointer events */}
            <div className={`w-full max-w-2xl border rounded-lg p-4 pointer-events-auto ${getNotificationStyle(notification.type)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  {getIcon(notification.type)}
                  <div className="break-all min-w-0">
                    <div className="break-words">{notification.message}</div>
                    {notification.txHash && (
                      <div className="text-sm opacity-75 break-all">
                        Transaction: {notification.txHash}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => notification.id === 'error' ? onDismissError?.() : onDismissNotification(notification.id)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permanent Status Banner */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className={`transition-all duration-300 ${getBgColor()}`}>
          <div className="container mx-auto">
            <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm">
              {!initialized ? (
                'Reading blocks...'
              ) : countdown > 0 ? (
                <CooldownMessage countdown={countdown} />
              ) : !txHash ? (
                'Ready to mint'
              ) : isLoading ? (
                <LoadingMessage txHash={txHash} />
              ) : isSuccess ? (
                `Transaction ${txHash} confirmed!`
              ) : (
                `Transaction ${txHash} in progress...`
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationBanner;