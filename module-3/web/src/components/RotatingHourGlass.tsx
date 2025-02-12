import React, { useState, useEffect } from 'react';

// Helper component for the rotating hourglass
const RotatingHourglass = () => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipped(prev => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span 
      className={`inline-block transition-transform duration-500 ${isFlipped ? 'rotate-180' : 'rotate-0'}`}
    >
      ⏳
    </span>
  );
};

// Helper component for the loading message
const LoadingMessage = ({ txHash }: { txHash: string }) => {
  return (
    <span className="flex items-center gap-2">
      <RotatingHourglass /> Transaction {txHash} is pending...
    </span>
  );
};

// Helper component for the cooldown message
const CooldownMessage = ({ countdown }: { countdown: number }) => {
  return (
    <span className="flex items-center gap-2">
      <RotatingHourglass /> Cooldown active: {countdown}s remaining before next mint
    </span>
  );
};

export { RotatingHourglass, LoadingMessage, CooldownMessage };