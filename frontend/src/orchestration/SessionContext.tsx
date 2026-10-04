import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SessionState {
  participantId: string | null;
  sessionId: string | null;
  condition: 'experimental' | 'control' | null;
  currentStage: string | null;
}

const defaultState: SessionState = {
  participantId: null,
  sessionId: null,
  condition: null,
  currentStage: null,
};

const SessionContext = createContext<SessionState>(defaultState);
const SessionDispatchContext = createContext<((partial: Partial<SessionState>) => void) | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(defaultState);

  const setSession = (partial: Partial<SessionState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  return (
    <SessionContext.Provider value={state}>
      <SessionDispatchContext.Provider value={setSession}>
        {children}
      </SessionDispatchContext.Provider>
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

export function useSessionDispatch() {
  const context = useContext(SessionDispatchContext);
  if (!context) {
    throw new Error('useSessionDispatch must be used within a SessionProvider');
  }
  return context;
}
