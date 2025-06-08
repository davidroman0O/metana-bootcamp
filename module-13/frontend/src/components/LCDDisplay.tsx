import React, { useState, forwardRef, useImperativeHandle } from 'react';
import '../styles/SlotMachine.css';

interface LCDDisplayProps {
  initialMessage?: string;
  className?: string;
  maxLineLength?: number; // Characters per line
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
  initialMessage = "Ready for glory?",
  className = "",
  maxLineLength = 20
}, ref) => {
  const [currentMessage, setCurrentMessage] = useState<string>(initialMessage);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [animationTimer, setAnimationTimer] = useState<NodeJS.Timeout | null>(null);
  const [blinkTimer, setBlinkTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMessage, setShowMessage] = useState<boolean>(true);

  // Split long messages into two lines intelligently
  const splitMessage = (message: string): { line1: string; line2: string } => {
    if (message.length <= maxLineLength) {
      return { line1: message, line2: '' };
    }

    // Try to split at word boundaries first
    const words = message.split(' ');
    let line1 = '';
    let line2 = '';
    
    // Build first line up to maxLineLength
    for (const word of words) {
      const testLine = line1 ? `${line1} ${word}` : word;
      if (testLine.length <= maxLineLength) {
        line1 = testLine;
      } else {
        // Start second line with remaining words
        const remainingWords = words.slice(words.indexOf(word));
        line2 = remainingWords.join(' ');
        break;
      }
    }

    // If second line is too long, truncate it
    if (line2.length > maxLineLength) {
      line2 = line2.substring(0, maxLineLength - 3) + '...';
    }

    // If we couldn't split at word boundaries and still have a very long first word
    if (!line1 && message.length > maxLineLength) {
      line1 = message.substring(0, maxLineLength);
      line2 = message.substring(maxLineLength, maxLineLength * 2);
      if (line2.length > maxLineLength) {
        line2 = line2.substring(0, maxLineLength - 3) + '...';
      }
    }

    return { line1, line2 };
  };

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
    setMessage("Fortune favors the brave!");
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

  // Split the current message into lines
  const { line1, line2 } = splitMessage(currentMessage);

  return (
    <div className={`lcd-display-bar ${className}`}>
      <div className="display-screen">
        <div 
          className="lcd-line lcd-line-1"
          style={{ visibility: showMessage ? 'visible' : 'hidden' }}
        >
          {line1}
        </div>
        {line2 && (
          <div 
            className="lcd-line lcd-line-2"
            style={{ visibility: showMessage ? 'visible' : 'hidden' }}
          >
            {line2}
          </div>
        )}
      </div>
    </div>
  );
});

LCDDisplay.displayName = 'LCDDisplay';

export default LCDDisplay;
export type { LCDDisplayRef }; 