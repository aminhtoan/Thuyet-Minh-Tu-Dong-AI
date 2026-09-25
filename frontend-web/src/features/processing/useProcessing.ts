import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { LanguageCode } from '../projects/types';
import { generationService } from './generationService';
import { processingService } from './processingService';
import { isProcessing } from './processingUtils';
import type { GenerationContext, ProcessingSession, ProcessingSnapshot } from './types';

type State = { loadStatus: 'LOADING' | 'READY' | 'FAILED'; context: GenerationContext | null; snapshot: ProcessingSnapshot | null; error: string | null };
const initialState: State = { loadStatus: 'LOADING', context: null, snapshot: null, error: null };

export function useProcessing(projectId: string, language?: LanguageCode) {
  const [state, dispatch] = useReducer((current: State, patch: Partial<State>) => ({ ...current, ...patch }), initialState);
  const loading = useRef<AbortController | null>(null);
  const session = useRef<ProcessingSession | null>(null);
  const load = useCallback(async () => {
    loading.current?.abort();
    session.current?.dispose();
    session.current = null;
    const controller = new AbortController();
    loading.current = controller;
    try {
      const context = await generationService.getContext(projectId, language, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!context) { dispatch({ loadStatus: 'READY', context: null, snapshot: null, error: null }); return; }
      const currentSession = processingService.createSession(context, (snapshot) => dispatch({ snapshot }));
      session.current = currentSession;
      dispatch({ loadStatus: 'READY', context, snapshot: currentSession.getStatus(), error: null });
    } catch {
      if (!controller.signal.aborted) dispatch({ loadStatus: 'FAILED', error: 'Unable to load your generation settings. Please retry.' });
    }
  }, [projectId, language]);

  useEffect(() => {
    void load();
    return () => { loading.current?.abort(); session.current?.dispose(); session.current = null; };
  }, [load]);

  const cancel = useCallback(() => session.current?.cancel(), []);
  function reload() {
    dispatch({ ...initialState });
    void load();
  }
  return { ...state, busy: isProcessing(state.snapshot),
    start: () => { void session.current?.start(); },
    retry: () => { void session.current?.retry(); },
    cancel, reload };
}
