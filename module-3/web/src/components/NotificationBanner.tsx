import React from 'react';
import { LoadingMessage, CooldownMessage } from './RotatingHourGlass';
import { AlertCircle, CheckCircle2, Timer } from 'lucide-react';

const NotificationBanner = ({ 
  txHash, 
  countdown, 
  initialized, 
  isError, 
  isLoading, 
  isSuccess 
}: { 
  txHash: `0x${string}` | null;
  countdown: number;
  initialized: boolean;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
}) => {
  // Define background color based on state
  const getBgColor = () => {
    if (countdown > 0) return 'bg-amber-50';
    if (txHash && isError) return 'bg-red-50';
    if (txHash && isSuccess) return 'bg-green-50';
    if (txHash && isLoading) return 'bg-blue-50';
    return 'bg-gray-50';
  };

  // Get appropriate icon based on state
  const getIcon = () => {
    if (countdown > 0) return <Timer className="w-5 h-5 text-amber-500" />;
    if (txHash && isError) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (txHash && isSuccess) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    return null;
  };

  // Only show banner if there's something to show
  if (!initialized || (!countdown && !txHash)) return null;

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
          ) : isError ? (
            `Transaction ${txHash} failed`
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