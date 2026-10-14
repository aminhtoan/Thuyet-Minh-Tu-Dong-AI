import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { LanguageCode } from '../projects/types';
import { translationService } from '../translation/translationService';
import type { SavedTranslation } from '../translation/translationService';
import { narrationService } from './narrationService';
import { voiceService } from './voiceService';
import { createNarrationConfig, filterVoicesByGender, hasNarrationConfigChanges, isValidSpeed, validateNarrationConfig } from './voiceUtils';
import type { NarrationConfig, Voice, VoiceEditorStatus, VoiceFilter } from './types';

type State = {
  status: VoiceEditorStatus;
  translation: SavedTranslation | null;
  voices: Voice[];
  draft: NarrationConfig | null;
  saved: NarrationConfig | null;
  error: string | null;
  failedAction: 'load' | 'save' | null;
};
const initialState: State = { status: 'LOADING', translation: null, voices: [], draft: null, saved: null, error: null, failedAction: null };

export function useVoiceEditor(projectId: string, language?: LanguageCode) {
  const [state, dispatch] = useReducer((current: State, patch: Partial<State>) => ({ ...current, ...patch }), initialState);
  const [gender, setGender] = useState<VoiceFilter>('All');
  const [query, setQuery] = useState('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [failedPreviewId, setFailedPreviewId] = useState<string | null>(null);
  const operation = useRef<AbortController | null>(null);
  const previewOperation = useRef<AbortController | null>(null);
  const busy = state.status === 'LOADING' || state.status === 'SAVING';
  const dirty = hasNarrationConfigChanges(state.draft, state.saved);
  const validationError = state.draft ? validateNarrationConfig(state.draft, state.voices) : null;

  const load = useCallback(async () => {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    try {
      const translation = await translationService.getSavedTranslation(projectId, language, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!translation) { dispatch({ ...initialState, status: 'READY' }); return; }
      const [voices, saved] = await Promise.all([
        voiceService.getVoices(translation.targetLanguage, { signal: controller.signal }),
        narrationService.getConfig(projectId, translation.targetLanguage, { signal: controller.signal }),
      ]);
      if (!controller.signal.aborted) dispatch({ translation, voices, saved, draft: saved ? { ...saved } : createNarrationConfig(translation), status: saved ? 'SAVED' : 'READY', error: null, failedAction: null });
    } catch (cause) {
      if (!controller.signal.aborted) dispatch({ status: 'FAILED', failedAction: 'load', error: cause instanceof Error ? cause.message : 'Không thể tải danh sách giọng đọc.' });
    }
  }, [projectId, language]);

  useEffect(() => {
    void load();
    return () => { operation.current?.abort(); previewOperation.current?.abort(); };
  }, [load]);

  function stopPreview() {
    previewOperation.current?.abort();
    previewOperation.current = null;
    setPreviewingVoiceId(null);
    setPreviewError(null);
    setFailedPreviewId(null);
  }
  async function preview(id: string) {
    if (busy || !state.voices.some((voice) => voice.id === id)) return;
    if (previewingVoiceId === id) { stopPreview(); return; }
    previewOperation.current?.abort();
    const controller = new AbortController();
    previewOperation.current = controller;
    setPreviewingVoiceId(id);
    setPreviewError(null);
    setFailedPreviewId(null);
    try {
      await voiceService.previewVoice(id, { signal: controller.signal });
      if (!controller.signal.aborted) setPreviewingVoiceId(null);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setPreviewingVoiceId(null);
        setFailedPreviewId(id);
        setPreviewError(cause instanceof Error ? cause.message : 'Không thể nghe thử giọng đọc này.');
      }
    }
  }
  function updateConfig(patch: Partial<Pick<NarrationConfig, 'voiceId' | 'speed'>>) {
    if (busy || !state.draft) return;
    if (patch.voiceId && !state.voices.some((voice) => voice.id === patch.voiceId && voice.isActive)) return;
    if (patch.speed !== undefined && !isValidSpeed(patch.speed)) return;
    const draft = { ...state.draft, ...patch };
    dispatch({ draft, status: hasNarrationConfigChanges(draft, state.saved) ? 'READY' : state.saved ? 'SAVED' : 'READY', error: null, failedAction: null });
  }
  async function save() {
    if (busy || !state.draft || !dirty || validationError) return;
    stopPreview();
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    dispatch({ status: 'SAVING', error: null, failedAction: null });
    try {
      const saved = await narrationService.saveConfig(projectId, state.draft, { signal: controller.signal });
      if (!controller.signal.aborted) dispatch({ draft: saved, saved: { ...saved }, status: 'SAVED' });
    } catch (cause) {
      if (!controller.signal.aborted) dispatch({ status: 'FAILED', failedAction: 'save', error: cause instanceof Error ? cause.message : 'Không thể lưu cấu hình.' });
    }
  }
  function reset() {
    if (busy || !dirty || !state.translation) return;
    stopPreview();
    dispatch({ draft: state.saved ? { ...state.saved } : createNarrationConfig(state.translation), status: state.saved ? 'SAVED' : 'READY', error: null, failedAction: null });
  }
  function retry() {
    if (busy) return;
    if (state.failedAction === 'save') void save();
    else { dispatch({ status: 'LOADING', error: null, failedAction: null }); void load(); }
  }
  return {
    ...state, busy, dirty, validationError, gender, query,
    visibleVoices: filterVoicesByGender(state.voices, gender, query),
    selectedVoice: state.voices.find((voice) => voice.id === state.draft?.voiceId),
    previewingVoiceId, previewError, failedPreviewId,
    canSave: Boolean(state.draft && dirty && !busy && !validationError && state.status !== 'FAILED'),
    setGender: (value: VoiceFilter) => { stopPreview(); setGender(value); },
    setQuery: (value: string) => { stopPreview(); setQuery(value); },
    updateConfig, preview, stopPreview, save, reset, retry,
  };
}
