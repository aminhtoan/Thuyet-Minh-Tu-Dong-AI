import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, session } from '@/lib/api';
import { env } from '@/config/env';
import type { Project } from '../projects/types';
import { resultService } from './resultService';
import { resultAccess } from './resultAccess';
import { protectedResultUrl } from './resultMedia';
import type { Result } from './types';

export type ResultSource = { uri: string; headers: Record<string, string> };
type State = { project: Project | null; result: Result | null; source: ResultSource | null; loading: boolean; error: string | null; blocked: string | null; key: string };
export function useResult(projectId: string, language?: string) {
  const revision = useSyncExternalStore(session.subscribe, session.getRevision, session.getRevision);
  const key = JSON.stringify([projectId, language, revision]);
  const initial: State = { project: null, result: null, source: null, loading: true, error: null, blocked: null, key };
  const [state, setState] = useState<State>(initial);
  const pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    const currentRevision = session.getRevision();
    const active = () => !controller.signal.aborted && currentRevision === session.getRevision();
    setState({ project: null, result: null, source: null, loading: true, error: null, blocked: null, key });
    try {
      if (!/^[a-f0-9]{24}$/i.test(projectId)) throw new Error('RESULT_PROJECT_INVALID');
      const { project } = await api<{ project: Project }>(`/projects/${projectId}`, { signal: controller.signal });
      if (!active()) return;
      if (project.id !== projectId) throw new Error('RESULT_PROJECT_MISMATCH');
      const access = resultAccess(project.workflow, language ?? null);
      if (!access.allowed) { setState({ project, result: null, source: null, loading: false, error: null, blocked: access.reason, key }); return; }
      const [result, media] = await Promise.all([
        resultService.getByProjectId(projectId, access.targetLanguage ?? undefined),
        // Same optional source metadata used by Web resultRows. Missing media
        // metadata must not invent values or conceal an artifact access error.
        api<{ media: { duration: number | null; fileSize: number } }>(`/projects/${projectId}/media`, { signal: controller.signal }).catch(() => null),
      ]);
      if (!active()) return;
      let source: ResultSource | null = null;
      if (result) {
        if (result.projectId !== projectId || result.languageCode !== access.targetLanguage) throw new Error('RESULT_BINDING_MISMATCH');
        const uri = protectedResultUrl(env.apiBaseUrl, result);
        const token = (await session.get())?.accessToken;
        if (!active()) return;
        if (!token) throw new Error('RESULT_SESSION_MISSING');
        source = { uri, headers: { Authorization: `Bearer ${token}` } };
      }
      const sourceMedia = media?.media;
      setState({ project: { ...project, ...(sourceMedia ? { durationSeconds: sourceMedia.duration ?? undefined, mediaSize: sourceMedia.fileSize } : {}) }, result, source, loading: false, error: null, blocked: null, key });
    } catch {
      if (active()) setState({ project: null, result: null, source: null, loading: false, error: 'Không tải được kết quả. Vui lòng kiểm tra quyền truy cập và thử lại.', blocked: null, key });
    }
  }, [projectId, language, key]);
  useFocusEffect(useCallback(() => {
    void reload();
    return () => {
      pending.current?.abort();
      // Stack screens can remain mounted behind Account/other routes. Removing
      // the source unmounts native players so they cannot keep playing offscreen.
      setState(current => ({ ...current, source: null, result: null, loading: true }));
    };
  }, [reload]));
  return { ...(state.key === key ? state : initial), reload };
}
