import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

export interface SessionState {
  participantId: string | null;
  sessionId: string | null;
  condition: 'experimental' | 'control' | null;
  currentStage: string | null;
  enabledStages: string[] | null;
}

const defaultState: SessionState = {
  participantId: null,
  sessionId: null,
  condition: null,
  currentStage: null,
  enabledStages: null,
};

const SessionContext = createContext<SessionState>(defaultState);
const SessionDispatchContext = createContext<((partial: Partial<SessionState>) => void) | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(defaultState);

  const setSession = (partial: Partial<SessionState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    apiClient.get('/protocol/active', { params: { _t: Date.now() } })
      .then((res) => {
        if (res.data?.enabled_stages) {
          setState((prev) => ({
            ...prev,
            enabledStages: res.data.enabled_stages,
          }));
        }
      })
      .catch((err) => {
        console.warn('Could not load active protocol in SessionProvider:', err);
      });
  }, []);

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
