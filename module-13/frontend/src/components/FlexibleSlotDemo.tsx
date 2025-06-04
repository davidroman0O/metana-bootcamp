import React, { useRef, useState } from 'react';
import SlotMachine from './SlotMachine';

// Symbol definitions - matching SlotMachine component
const SYMBOLS = [
  { id: 1, emoji: '📉', name: 'DUMP', color: '#ef4444' },      // Red
  { id: 2, emoji: '🤡', name: 'COPE', color: '#eab308' },      // Yellow  
  { id: 3, emoji: '📈', name: 'PUMP', color: '#22c55e' },      // Green
  { id: 4, emoji: '💎', name: 'DIAMOND', color: '#3b82f6' },   // Blue
  { id: 5, emoji: '🚀', name: 'ROCKET', color: '#a855f7' },    // Purple
  { id: 6, emoji: '🐵', name: 'JACKPOT', color: '#facc15' }    // Gold
];

interface SlotMachineRef {
  // Core API
  startSpin: (targetSymbols?: number[]) => boolean;
  forceStop: () => boolean;
  
  // State queries
  getState: () => string;
  isReady: () => boolean;
  isSpinning: () => boolean;
  
  // Display control
  updateDisplayMessage: (message: string) => void;
  getDisplayMessage: () => string;
  
  // Individual reel control
  setReelTarget: (reelIndex: number, symbol: number) => boolean;
  setAllReelTargets: (symbols: number[]) => boolean;
  
  // Reveal order control APIs
  setAllReelTargetsSequential: (symbols: number[]) => boolean;
  setAllReelTargetsSimultaneous: (symbols: number[]) => boolean;
  setReelTargetWithRevealOrder: (reelIndex: number, symbol: number, revealOrder: number) => boolean;
  
  // Utility
  reset: () => void;
}

const FlexibleSlotDemo: React.FC = () => {
  const [selectedReelCount, setSelectedReelCount] = useState(3);
  const slotRef = useRef<SlotMachineRef>(null);
  const [message, setMessage] = useState('');
  const [isChangingConfig, setIsChangingConfig] = useState(false);

  // Symbol selector state
  const [selectedSymbols, setSelectedSymbols] = useState<number[]>(Array(3).fill(1));

  const testConfigurations = [
    { count: 1, name: 'Single Reel', description: 'Minimalist slot' },
    { count: 2, name: 'Double Trouble', description: 'Classic pair setup' },
    { count: 3, name: 'Traditional', description: 'Standard 3-reel slot' },
    { count: 4, name: 'Quad Power', description: '4-reel excitement' },
    { count: 5, name: 'Mega Reels', description: '5-reel madness' },
    { count: 7, name: 'Lucky Seven', description: '7 reels of luck' }
  ];

  const handleConfigChange = (count: number) => {
    if (isChangingConfig) return; // Prevent rapid clicks
    
    setIsChangingConfig(true);
    
    // Reset the slot machine first if it's running
    if (slotRef.current) {
      slotRef.current.reset();
    }
    
    // Update selected symbols array to match new reel count
    setSelectedSymbols(Array(count).fill(1));
    
    // Small delay to ensure clean state before changing
    setTimeout(() => {
      setSelectedReelCount(count);
      setMessage(`Switched to ${count} reel${count !== 1 ? 's' : ''}!`);
      
      // Re-enable after state change
      setTimeout(() => {
        setIsChangingConfig(false);
      }, 500);
    }, 100);
  };

  // Update symbol for specific reel position
  const updateSymbol = (reelIndex: number, symbolId: number) => {
    const newSymbols = [...selectedSymbols];
    newSymbols[reelIndex] = symbolId;
    setSelectedSymbols(newSymbols);
  };

  // Execute custom targeted spin with selected symbols
  const executeCustomSpin = () => {
    if (!slotRef.current) {
      setMessage('Machine not available!');
      return;
    }

    const currentState = slotRef.current.getState();
    
    // Allow execution when idle (starts new spin) OR when spinning (sets targets for current spin)
    if (currentState === 'idle') {
      // Start new spin with targets
      slotRef.current.startSpin(selectedSymbols);
      setTimeout(() => {
        slotRef.current?.setAllReelTargetsSequential(selectedSymbols);
      }, 1000);
      
      const symbolNames = selectedSymbols.map(id => SYMBOLS[id - 1].name);
      setMessage(`Custom spin started: [${symbolNames.join(', ')}]`);
      
    } else if (currentState === 'spinning') {
      // Set targets for already spinning machine
      slotRef.current.setAllReelTargetsSequential(selectedSymbols);
      
      const symbolNames = selectedSymbols.map(id => SYMBOLS[id - 1].name);
      setMessage(`Targets set: [${symbolNames.join(', ')}]`);
      
    } else {
      setMessage(`Cannot execute - machine is ${currentState}`);
    }
  };

  const testTargetedSpin = () => {
    if (!slotRef.current) {
      setMessage('Machine not available!');
      return;
    }

    const currentState = slotRef.current.getState();
    
    if (currentState === 'idle') {
      // Generate random targets and start new spin
      const targets = Array.from({ length: selectedReelCount }, () => Math.floor(Math.random() * 6) + 1);
      
      slotRef.current.startSpin(targets);
      setTimeout(() => {
        slotRef.current?.setAllReelTargetsSequential(targets);
      }, 1000);
      
      setMessage(`Random spin started: [${targets.join(', ')}]`);
      
    } else if (currentState === 'spinning') {
      // Set random targets for already spinning machine
      const targets = Array.from({ length: selectedReelCount }, () => Math.floor(Math.random() * 6) + 1);
      slotRef.current.setAllReelTargetsSequential(targets);
      
      setMessage(`Random targets set: [${targets.join(', ')}]`);
      
    } else {
      setMessage(`Cannot execute - machine is ${currentState}`);
    }
  };

  const testJackpotSpin = () => {
    if (!slotRef.current) {
      setMessage('Machine not available!');
      return;
    }

    const currentState = slotRef.current.getState();
    
    if (currentState === 'idle') {
      // All reels show jackpot (symbol 6) and start new spin
      const targets = Array(selectedReelCount).fill(6);
      
      slotRef.current.startSpin(targets);
      setTimeout(() => {
        slotRef.current?.setAllReelTargetsSequential(targets);
      }, 1000);
      
      setMessage(`Jackpot spin started! All ${selectedReelCount} reels targeting symbol 6!`);
      
    } else if (currentState === 'spinning') {
      // Set jackpot targets for already spinning machine
      const targets = Array(selectedReelCount).fill(6);
      slotRef.current.setAllReelTargetsSequential(targets);
      
      setMessage(`Jackpot targets set! All ${selectedReelCount} reels targeting symbol 6!`);
      
    } else {
      setMessage(`Cannot execute - machine is ${currentState}`);
    }
  };

  const handleResult = (symbols: number[], payout: number, payoutType: string) => {
    setMessage(`Result: [${symbols.join(', ')}] - ${payoutType} - ${payout} chips!`);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">
          🎰 Flexible Slot Machine Demo 🎰
        </h1>
        
        <div className="text-center mb-8">
          <p className="text-xl mb-4">
            Experience slot machines with 1 to 10 reels!
          </p>
          <p className="text-gray-300">
            Current Configuration: <span className="text-yellow-400 font-bold">{selectedReelCount} Reels</span>
          </p>
        </div>

        {/* Configuration Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {testConfigurations.map((config) => (
            <button
              key={config.count}
              onClick={() => handleConfigChange(config.count)}
              disabled={isChangingConfig}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedReelCount === config.count
                  ? 'border-yellow-400 bg-yellow-900 text-yellow-200'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-400'
              } ${isChangingConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-lg font-bold">{config.name}</div>
              <div className="text-sm text-gray-300">{config.count} reel{config.count !== 1 ? 's' : ''}</div>
              <div className="text-xs mt-1">{config.description}</div>
            </button>
          ))}
        </div>

        {/* Slot Machine */}
        <div className="flex justify-center mb-8">
          {!isChangingConfig && (
            <SlotMachine
              key={`slot-machine-${selectedReelCount}`} // Force recreation on reel count change
              ref={slotRef}
              reelCount={selectedReelCount}
              onResult={handleResult}
              isConnected={true}
            />
          )}
          {isChangingConfig && (
            <div className="flex items-center justify-center h-96 text-yellow-400">
              <div className="text-center">
                <div className="text-2xl mb-2">🔄</div>
                <div>Reconfiguring...</div>
              </div>
            </div>
          )}
        </div>

        {/* Symbol Selector Interface */}
        {!isChangingConfig && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-600">
            <h3 className="text-xl font-bold mb-4 text-yellow-400 text-center">
              🎯 Custom Symbol Selector
            </h3>
            <p className="text-gray-300 text-center mb-6">
              Choose target symbols for each reel position, then execute your custom spin!
            </p>
            <div className="text-center mb-4 p-3 bg-blue-900 rounded-lg border border-blue-600">
              <p className="text-blue-200 text-sm">
                💡 <strong>Pro Tip:</strong> You can pull the lever first to start spinning, then select symbols and click any button below to send targets to the spinning machine!
              </p>
            </div>
            
            {/* Reel Selector Grid */}
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${selectedReelCount}, 1fr)` }}>
              {Array.from({ length: selectedReelCount }).map((_, reelIndex) => (
                <div key={reelIndex} className="text-center">
                  <h4 className="text-lg font-bold text-purple-400 mb-3">
                    Reel {reelIndex + 1}
                  </h4>
                  
                  {/* Current Selection Display */}
                  <div className="mb-3 p-3 bg-gray-700 rounded-lg border-2 border-purple-500">
                    <div className="text-3xl mb-1">
                      {SYMBOLS[selectedSymbols[reelIndex] - 1].emoji}
                    </div>
                    <div className="text-sm font-bold" style={{ color: SYMBOLS[selectedSymbols[reelIndex] - 1].color }}>
                      {SYMBOLS[selectedSymbols[reelIndex] - 1].name}
                    </div>
                  </div>
                  
                  {/* Symbol Selection Buttons */}
                  <div className="grid grid-cols-2 gap-1">
                    {SYMBOLS.map((symbol) => (
                      <button
                        key={symbol.id}
                        onClick={() => updateSymbol(reelIndex, symbol.id)}
                        className={`p-2 rounded transition-all border-2 ${
                          selectedSymbols[reelIndex] === symbol.id
                            ? 'border-yellow-400 bg-yellow-900'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-400'
                        }`}
                        title={symbol.name}
                      >
                        <div className="text-lg">{symbol.emoji}</div>
                        <div className="text-xs" style={{ color: symbol.color }}>
                          {symbol.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Preset Buttons */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedSymbols(Array(selectedReelCount).fill(6))}
                disabled={isChangingConfig}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded text-sm font-bold transition-colors"
              >
                🐵 All Jackpot
              </button>
              <button
                onClick={() => setSelectedSymbols(Array(selectedReelCount).fill(5))}
                disabled={isChangingConfig}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm font-bold transition-colors"
              >
                🚀 All Rockets
              </button>
              <button
                onClick={() => setSelectedSymbols(Array(selectedReelCount).fill(3))}
                disabled={isChangingConfig}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm font-bold transition-colors"
              >
                📈 All Pumps
              </button>
              <button
                onClick={() => setSelectedSymbols(Array.from({ length: selectedReelCount }, () => Math.floor(Math.random() * 6) + 1))}
                disabled={isChangingConfig}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 rounded text-sm font-bold transition-colors"
              >
                🎲 Randomize
              </button>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <button
            onClick={executeCustomSpin}
            disabled={isChangingConfig}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-colors text-lg"
          >
            🎯 Execute Custom Spin
          </button>
          
          <button
            onClick={testTargetedSpin}
            disabled={isChangingConfig}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-colors"
          >
            🎲 Random Targeted Spin
          </button>
          
          <button
            onClick={testJackpotSpin}
            disabled={isChangingConfig}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-colors"
          >
            💰 Jackpot Test
          </button>
          
          <button
            onClick={() => slotRef.current?.reset()}
            disabled={isChangingConfig}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-bold transition-colors"
          >
            🔄 Reset
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-600">
            <p className="text-yellow-300">{message}</p>
          </div>
        )}

        {/* Technical Info */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-600">
          <h3 className="text-xl font-bold mb-4 text-yellow-400">🔧 Technical Features</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-bold text-green-400 mb-2">Dynamic Capabilities:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• 1-10 reel support</li>
                <li>• Auto-adapting payout logic</li>
                <li>• Sequential reveal timing</li>
                <li>• Flexible API methods</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-purple-400 mb-2">APIs Available:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• setAllReelTargets(symbols[])</li>
                <li>• setReelTarget(index, symbol)</li>
                <li>• Sequential/Simultaneous modes</li>
                <li>• State management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlexibleSlotDemo; 