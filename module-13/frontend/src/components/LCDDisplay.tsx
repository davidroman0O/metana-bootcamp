import React, { useState, forwardRef, useImperativeHandle } from 'react';
import '../styles/SlotMachine.css';

interface LCDDisplayProps {
  initialMessage?: string;
  className?: string;
}

interface LCDDisplayRef {
  // Basic display control
  setMessage: (message: string) => void;
  getMessage: () => string;
  clear: () => void;
  
  // Pattern presets
  setIdlePattern: () => void;
  setSpinningPattern: () => void;
  setWinPattern: (amount?: number) => void;
  setErrorPattern: () => void;
  
  // Animation control
  startBlinking: (interval?: number) => void;
  stopBlinking: () => void;
  flashMessage: (message: string, duration?: number) => void;
  
  // Advanced patterns
  setMotivationalQuote: () => void;
  setASCIIAnimation: (type: 'dots' | 'bars' | 'arrows') => void;
  stopAnimation: () => void;
  
  // Custom content
  setCustomPattern: (pattern: string) => void;
}

const LCDDisplay = forwardRef<LCDDisplayRef, LCDDisplayProps>(({
  initialMessage = "888 888 888",
  className = ""
}, ref) => {
  const [currentMessage, setCurrentMessage] = useState<string>(initialMessage);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [animationTimer, setAnimationTimer] = useState<NodeJS.Timeout | null>(null);
  const [blinkTimer, setBlinkTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMessage, setShowMessage] = useState<boolean>(true);

  // Motivational quotes for future use
  const motivationalQuotes = [
    "YOU GOT THIS",
    "DIAMOND HANDS", 
    "TO THE MOON",
    "HODL STRONG",
    "BIG WIN AHEAD",
    "LUCK IS YOURS",
    "FORTUNE CALLS"
  ];

  // ASCII patterns for animations
  const asciiPatterns = {
    dots: ["...   ...", "..   ..", ".   .", "   ", ".   .", "..   ..", "...   ..."],
    bars: ["|||   |||", "||   ||", "|   |", "   ", "|   |", "||   ||", "|||   |||"],
    arrows: [">>>   >>>", ">>   >>", ">   >", "   ", ">   >", ">>   >>", ">>>   >>>"]
  };

  // Clear any running timers
  const clearTimers = () => {
    if (animationTimer) {
      clearInterval(animationTimer);
      setAnimationTimer(null);
    }
    if (blinkTimer) {
      clearInterval(blinkTimer);
      setBlinkTimer(null);
    }
  };

  // API Methods
  const setMessage = (message: string) => {
    clearTimers();
    setIsBlinking(false);
    setShowMessage(true);
    setCurrentMessage(message);
  };

  const getMessage = (): string => {
    return currentMessage;
  };

  const clear = () => {
    setMessage("   ");
  };

  const setIdlePattern = () => {
    setMessage("888 888 888");
  };

  const setSpinningPattern = () => {
    setMessage(">>> >>> >>>");
  };

  const setWinPattern = (amount?: number) => {
    if (amount) {
      setMessage(`WIN ${amount} WIN`);
    } else {
      setMessage("WIN WIN WIN");
    }
  };

  const setErrorPattern = () => {
    setMessage("ERR ERR ERR");
  };

  const startBlinking = (interval: number = 500) => {
    clearTimers();
    setIsBlinking(true);
    const timer = setInterval(() => {
      setShowMessage(prev => !prev);
    }, interval);
    setBlinkTimer(timer);
  };

  const stopBlinking = () => {
    if (blinkTimer) {
      clearInterval(blinkTimer);
      setBlinkTimer(null);
    }
    setIsBlinking(false);
    setShowMessage(true);
  };

  const flashMessage = (message: string, duration: number = 2000) => {
    const originalMessage = currentMessage;
    setMessage(message);
    startBlinking(200);
    
    setTimeout(() => {
      stopBlinking();
      setMessage(originalMessage);
    }, duration);
  };

  const setMotivationalQuote = () => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setMessage(randomQuote);
  };

  const setASCIIAnimation = (type: 'dots' | 'bars' | 'arrows') => {
    clearTimers();
    const patterns = asciiPatterns[type];
    let patternIndex = 0;
    
    const timer = setInterval(() => {
      setCurrentMessage(patterns[patternIndex]);
      patternIndex = (patternIndex + 1) % patterns.length;
    }, 300);
    
    setAnimationTimer(timer);
  };

  const stopAnimation = () => {
    clearTimers();
    setIdlePattern();
  };

  const setCustomPattern = (pattern: string) => {
    setMessage(pattern);
  };

  // Expose API to parent
  useImperativeHandle(ref, () => ({
    setMessage,
    getMessage,
    clear,
    setIdlePattern,
    setSpinningPattern,
    setWinPattern,
    setErrorPattern,
    startBlinking,
    stopBlinking,
    flashMessage,
    setMotivationalQuote,
    setASCIIAnimation,
    stopAnimation,
    setCustomPattern
  }));

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  return (
    <div className={`lcd-display-bar ${className}`}>
      <div className="display-screen">
        <span style={{ visibility: showMessage ? 'visible' : 'hidden' }}>
          {currentMessage}
        </span>
      </div>
    </div>
  );
});

LCDDisplay.displayName = 'LCDDisplay';

export default LCDDisplay;
export type { LCDDisplayRef }; 