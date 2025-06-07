import React from 'react';
import { useAppMode } from '../contexts/AppModeContext';
import { Settings, Gamepad2, Play, PauseCircle } from 'lucide-react';

const DevModeSwitcher: React.FC = () => {
  const {
    applicationMode,
    setApplicationMode,
    slotMachineMode,
    setSlotMachineMode,
    isRealMode,
    isManualMode,
    isControlledMode,
    isAnimatedMode,
    testSpinFunction
  } = useAppMode();

  const handleTestSpin = () => {
    if (testSpinFunction) {
      testSpinFunction();
    }
  };

  return (
    <div className="dev-mode-switcher fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-gray-600">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="text-yellow-400" size={20} />
        <h3 className="text-white font-bold">Dev Mode</h3>
      </div>

      {/* Application Mode Toggle */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-gray-400 block">Application Mode:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setApplicationMode('manual')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              isManualMode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Gamepad2 size={14} className="inline mr-1" />
            Manual
          </button>
          <button
            onClick={() => setApplicationMode('real')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              isRealMode
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Smart Contract
          </button>
        </div>
      </div>

      {/* Slot Machine Mode Toggle */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-gray-400 block">Slot Machine Mode:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setSlotMachineMode('controlled')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              isControlledMode
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <PauseCircle size={14} className="inline mr-1" />
            Controlled
          </button>
          <button
            onClick={() => setSlotMachineMode('animated')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              isAnimatedMode
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Play size={14} className="inline mr-1" />
            Animated
          </button>
        </div>
      </div>

      {/* Test Spin Button */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-gray-400 block">Testing:</label>
        <button
          onClick={handleTestSpin}
          disabled={!isControlledMode || !testSpinFunction}
          className={`w-full px-3 py-2 text-sm rounded font-medium transition-all ${
            isControlledMode && testSpinFunction
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          🎰 Test Spin
        </button>
        <div className="text-xs text-gray-400">
          {!isControlledMode && "Only available in Controlled mode"}
          {isControlledMode && !testSpinFunction && "Waiting for slot machine..."}
          {isControlledMode && testSpinFunction && "Ready to test!"}
        </div>
      </div>

      {/* Current Status */}
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="text-xs text-gray-400">
          Status: <span className="text-white font-medium">{applicationMode}</span> / <span className="text-white font-medium">{slotMachineMode}</span>
        </div>
      </div>
    </div>
  );
};

export default DevModeSwitcher; 