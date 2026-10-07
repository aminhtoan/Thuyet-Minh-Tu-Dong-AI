import { useCallback, useEffect, useReducer, useRef } from 'react';
import { filterTargetLanguages } from '../projects/languages';
import type { LanguageCode } from '../projects/types';
import { transcriptService } from '../transcript/transcriptService';
import type { Transcript } from '../transcript/types';
import { translationService } from './translationService';
import { copyTranslation, hasTranslationChanges, validateTranslation } from './translationUtils';
import type { Translation, TranslationStatus } from './types';

type FailedAction = 'load' | 'translate' | 'save' | null;
type State = {
  status: TranslationStatus;
  transcript: Transcript | null;
  targetLanguage: LanguageCode | null;
  draft: Translation | null;
  saved: Translation | null;
  error: string | null;
  failedAction: FailedAction;
};
const initialState: State = {
  status: 'LOADING', transcript: null, targetLanguage: null,
  draft: null, saved: null, error: null, failedAction: null,
};

export function useTranslationEditor(projectId: string, preferredTarget: LanguageCode) {
  const [state, dispatch] = useReducer((current: State, patch: Partial<State>) => ({ ...current, ...patch }), initialState);
  const operation = useRef<AbortController | null>(null);
  const dirty = hasTranslationChanges(state.draft, state.saved);
  const errors = state.draft ? validateTranslation(state.draft) : {};
  const busy = ['LOADING', 'TRANSLATING', 'SAVING'].includes(state.status);
  const invalid = !state.draft?.segments.length || Object.keys(errors).length > 0;

  const startOperation = useCallback(() => {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    return controller;
  }, []);

  const load = useCallback(async (requestedTarget?: LanguageCode) => {
    const controller = startOperation();
    try {
      const transcript = await transcriptService.getTranscript(projectId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!transcript?.segments.length || transcript.status !== 'SAVED') {
        dispatch({ ...initialState, status: 'NOT_STARTED' });
        return;
      }
      const choices = filterTargetLanguages(transcript.languageCode);
      const desired = requestedTarget ?? preferredTarget;
      const targetLanguage = choices.find((language) => language.code === desired)?.code ?? choices[0].code;
      const saved = await translationService.get(projectId, targetLanguage, { signal: controller.signal });
      if (controller.signal.aborted) return;
      dispatch({ transcript, targetLanguage, draft: saved, saved, status: saved ? 'SAVED' : 'NOT_STARTED', error: null, failedAction: null });
    } catch (cause) {
      if (!controller.signal.aborted) dispatch({ status: 'FAILED', failedAction: 'load', error: cause instanceof Error ? cause.message : 'Không thể tải bản dịch.' });
    }
  }, [projectId, preferredTarget, startOperation]);

  useEffect(() => {
    void load();
    return () => operation.current?.abort();
  }, [load]);

  function changeTarget(targetLanguage: LanguageCode) {
    if (busy || dirty || !state.transcript || targetLanguage === state.transcript.languageCode || targetLanguage === state.targetLanguage) return;
    dispatch({ targetLanguage, draft: null, saved: null, status: 'LOADING', error: null, failedAction: null });
    void load(targetLanguage);
  }

  async function translate() {
    if (busy || state.draft || !state.transcript || !state.targetLanguage) return;
    const controller = startOperation();
    dispatch({ status: 'TRANSLATING', error: null, failedAction: null });
    try {
      const draft = await translationService.translate(projectId, state.transcript, state.targetLanguage, { signal: controller.signal });
      if (!controller.signal.aborted) dispatch({ draft, saved: null, status: 'READY' });
    } catch (cause) {
      if (!controller.signal.aborted) dispatch({ status: 'FAILED', failedAction: 'translate', error: cause instanceof Error ? cause.message : 'Không thể dịch bản ghi.' });
    }
  }

  function updateSegment(id: string, translatedText: string) {
    if (busy || !state.draft) return;
    const draft = { ...state.draft, segments: state.draft.segments.map((segment) => segment.id === id ? { ...segment, translatedText } : segment) };
    dispatch({ draft, status: hasTranslationChanges(draft, state.saved) ? 'READY' : 'SAVED', error: null, failedAction: null });
  }

  async function save() {
    if (busy || !dirty || invalid || !state.draft) return;
    const controller = startOperation();
    dispatch({ status: 'SAVING', error: null, failedAction: null });
    try {
      const saved = await translationService.save(projectId, state.draft, { signal: controller.signal });
      if (!controller.signal.aborted) dispatch({ draft: saved, saved: copyTranslation(saved), status: 'SAVED' });
    } catch (cause) {
      if (!controller.signal.aborted) dispatch({ status: 'FAILED', failedAction: 'save', error: cause instanceof Error ? cause.message : 'Không thể lưu bản dịch.' });
    }
  }

  function reset() {
    if (busy || !dirty) return;
    dispatch({ draft: state.saved ? copyTranslation(state.saved) : null, status: state.saved ? 'SAVED' : 'NOT_STARTED', error: null, failedAction: null });
  }

  function retry() {
    if (busy) return;
    if (state.failedAction === 'save') void save();
    else if (state.failedAction === 'translate') void translate();
    else {
      dispatch({ status: 'LOADING', error: null, failedAction: null });
      void load(state.targetLanguage ?? undefined);
    }
  }

  return { ...state, dirty, errors, busy, invalid, canSave: dirty && !busy && !invalid && state.status !== 'FAILED',
    canReset: dirty && !busy, canChangeTarget: !dirty && !busy,
    changeTarget, translate, updateSegment, save, reset, retry };
}
