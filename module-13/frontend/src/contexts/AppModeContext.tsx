import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type ApplicationMode = 'real' | 'manual';
export type SlotMachineMode = 'controlled' | 'animated';

interface AppModeContextType {
  // Application mode
  applicationMode: ApplicationMode;
  setApplicationMode: (mode: ApplicationMode) => void;
  
  // Slot machine mode
  slotMachineMode: SlotMachineMode;
  setSlotMachineMode: (mode: SlotMachineMode) => void;
  
  // Helper functions
  isRealMode: boolean;
  isManualMode: boolean;
  isControlledMode: boolean;
  isAnimatedMode: boolean;
  
  // Test functions
  testSpinFunction: (() => void) | null;
  setTestSpinFunction: (fn: (() => void) | null) => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

interface AppModeProviderProps {
  children: ReactNode;
}

export const AppModeProvider: React.FC<AppModeProviderProps> = ({ children }) => {
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>('manual'); // Start in manual for development
  const [slotMachineMode, setSlotMachineMode] = useState<SlotMachineMode>('controlled'); // Start in controlled for testing
  const [testSpinFunction, setTestSpinFunctionState] = useState<(() => void) | null>(null);

  // Stabilize the setTestSpinFunction to prevent infinite re-renders
  const setTestSpinFunction = useCallback((fn: (() => void) | null) => {
    setTestSpinFunctionState(fn);
  }, []);

  const value: AppModeContextType = {
    applicationMode,
    setApplicationMode,
    slotMachineMode,
    setSlotMachineMode,
    
    // Helper booleans
    isRealMode: applicationMode === 'real',
    isManualMode: applicationMode === 'manual',
    isControlledMode: slotMachineMode === 'controlled',
    isAnimatedMode: slotMachineMode === 'animated',
    
    // Test functions
    testSpinFunction,
    setTestSpinFunction,
  };

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = (): AppModeContextType => {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}; 