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
  // Handle error state first
  if (errorMessage || isError) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-red-50">
        <div className="max-w-2xl mx-auto bg-white border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">
              Transaction Failed
            </h3>
            <div className="text-red-700 mt-1">
              {errorMessage || 'The transaction could not be completed. Please try again.'}
              {txHash && (
                <span className="block mt-1 text-sm text-red-600">
                  Transaction: {txHash}
                </span>
              )}
            </div>
          </div>
          {onDismissError && (
            <button 
              onClick={onDismissError}
              className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

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

  return (
    <>
      {/* Stackable Notifications Container */}
      <div className="fixed inset-x-0 bottom-0 z-50 space-y-4 pb-14">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex justify-center px-4">
            <div className={`w-full max-w-2xl border rounded-lg p-4 ${getNotificationStyle(notification.type)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIcon(notification.type)}
                  <div>
                    <div>{notification.message}</div>
                    {notification.txHash && (
                      <div className="text-sm opacity-75">
                        Transaction: {notification.txHash}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDismissNotification(notification.id)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
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