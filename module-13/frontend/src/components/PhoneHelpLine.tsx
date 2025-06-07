import React, { useState } from 'react';
import { Phone } from 'lucide-react';

interface PhoneHelpLineProps {
  isConnected: boolean;
}

const HELP_MESSAGES = [
  "Hello? Hello?... *static* ...sorry, all our operators are busy losing at slots too.",
  "*dial tone* The number you have dialed is temporarily disconnected due to excessive gambling.",
  "Gambling Helpline? What's that? We only provide tips on which slot symbols to pray for.",
  "*busy signal* Even our help line is addicted to the slots. Please try again never.",
  "You've reached the Boomer's Last Hope helpline. Have you tried just winning instead?",
  "*mechanical voice* Press 1 to continue gambling, Press 2 to gamble more, Press 3 to... oh wait.",
  "Help? The only help we can offer is: DIAMOND DIAMOND DIAMOND = BIG WIN!",
  "*phone rings endlessly* ...like your hopes of breaking even.",
];

const PhoneHelpLine: React.FC<PhoneHelpLineProps> = ({ isConnected }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  if (!isConnected) return null;

  const handlePhoneClick = () => {
    setIsPressed(true);
    
    // Animate phone movement
    setTimeout(() => {
      setIsPressed(false);
      
      // Show random help message
      const randomMessage = HELP_MESSAGES[Math.floor(Math.random() * HELP_MESSAGES.length)];
      setCurrentMessage(randomMessage);
      setShowMessage(true);
      
      // Hide message after 5 seconds
      setTimeout(() => {
        setShowMessage(false);
      }, 5000);
    }, 200);
  };

  return (
    <div className="phone-helpline fixed bottom-6 right-6 z-50">
      {/* Tooltip Message */}
      {showMessage && (
        <div className="message-tooltip absolute bottom-16 right-0 max-w-xs bg-black/90 text-white p-4 rounded-lg border border-gray-600 shadow-xl">
          <div className="text-sm">{currentMessage}</div>
          <div className="absolute bottom-0 right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-black/90 transform translate-y-full"></div>
        </div>
      )}

      {/* Phone Button */}
      <button
        onClick={handlePhoneClick}
        className={`phone-button bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl border-4 border-red-800 transition-all duration-200 ${
          isPressed ? 'transform translate-x-1 translate-y-1 scale-95' : 'hover:scale-110'
        }`}
        title="Gambling Help Line (totally reliable)"
      >
        <Phone size={32} className={isPressed ? 'animate-bounce' : ''} />
      </button>

      {/* Help Label */}
      <div className="absolute -top-2 -left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
        HELP
      </div>

      {/* Emergency Light */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
    </div>
  );
};

export default PhoneHelpLine; 