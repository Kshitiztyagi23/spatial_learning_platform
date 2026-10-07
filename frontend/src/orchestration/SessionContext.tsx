import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';
import type { Condition } from '../api/types';

export interface SessionState {
  participantId: string | null;
  sessionId: string | null;
  condition: Condition | null;
  participantCode: string | null;
  currentStage: string | null;
  enabledStages: string[] | null;
}

const defaultState: SessionState = {
  participantId: null,
  sessionId: null,
  condition: null,
  participantCode: null,
  currentStage: null,
  enabledStages: null,
};

// Tab-scoped so a refresh resumes the session, while a new tab or browser on a
// shared classroom machine starts a fresh participant.
const STORAGE_KEY = 'study_session';

function loadPersisted(): SessionState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved?.sessionId) {
      return {
        ...defaultState,
        participantId: saved.participantId,
        sessionId: saved.sessionId,
        condition: saved.condition,
        participantCode: saved.participantCode ?? null,
      };
    }
  } catch {
    // Corrupt entry: fall through to a fresh session
  }
  return defaultState;
}

const SessionContext = createContext<SessionState>(defaultState);
const SessionDispatchContext = createContext<((partial: Partial<SessionState>) => void) | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(loadPersisted);

  useEffect(() => {
    if (state.sessionId) {
      const { participantId, sessionId, condition, participantCode } = state;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ participantId, sessionId, condition, participantCode }));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [state.participantId, state.sessionId, state.condition, state.participantCode]);

  const setSession = (partial: Partial<SessionState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    apiClient.get('/protocol/active', { params: { _t: Date.now() } })
      .then((res) => {
        if (res.data?.enabled_stages) {
          // Before a session exists the protocol's stages are the best guess;
          // once one exists its own plan (set by the session) wins.
          setState((prev) => (prev.sessionId ? prev : { ...prev, enabledStages: res.data.enabled_stages }));
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
