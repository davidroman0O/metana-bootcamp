import React from 'react';
import { LoadingMessage, CooldownMessage } from './RotatingHourGlass';
import { AlertCircle, CheckCircle2, Timer, X } from 'lucide-react';

const NotificationBanner = ({ 
  txHash, 
  countdown, 
  initialized, 
  isError, 
  isLoading, 
  isSuccess,
  errorMessage,
  onDismissError
}: { 
  txHash: `0x${string}` | null;
  countdown: number;
  initialized: boolean;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  errorMessage?: string;
  onDismissError?: () => void;
}) => {
  const hasError = errorMessage || isError;
  
  if (!initialized && !hasError && !countdown && !txHash) return null;

  // Handle error state
  if (hasError) {
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
          <button 
            onClick={onDismissError}
            className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // Handle other states
  const getBgColor = () => {
    if (countdown > 0) return 'bg-amber-50';
    if (txHash && isSuccess) return 'bg-green-50';
    if (txHash && isLoading) return 'bg-blue-50';
    return 'bg-gray-50';
  };

  const getIcon = () => {
    if (countdown > 0) return <Timer className="w-5 h-5 text-amber-500" />;
    if (txHash && isSuccess) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    return null;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${getBgColor()}`}>
      <div className="container mx-auto">
        <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm">
          {getIcon()}
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
  );
};

export default NotificationBanner;