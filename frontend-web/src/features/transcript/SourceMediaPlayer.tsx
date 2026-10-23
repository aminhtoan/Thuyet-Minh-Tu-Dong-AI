import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { apiBlob } from '../../lib/api';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import type { DataState } from '../projects/types';
import { createSourceMediaLoader, scheduleSourceMediaAutoLoad, sourceMediaError, sourceMediaInitialState } from './sourcePlayback.mjs';

type PlayerState = { status: DataState; error: string | null; retryable: boolean };
type Props = { projectId: string; mediaType?: string; mediaSize?: number; metadataState: DataState; playerRef: RefObject<HTMLMediaElement | null>; onTimeChange: (time: number) => void; onReadyChange: (ready: boolean) => void; framedVideo?: boolean };

export function SourceMediaPlayer({ projectId, mediaType, mediaSize, metadataState, playerRef, onTimeChange, onReadyChange, framedVideo = false }: Props) {
  const initialState = sourceMediaInitialState(metadataState, mediaType, mediaSize);
  const shouldAutoLoad = initialState.status === 'LOADING';
  const [state, setState] = useState<PlayerState>({ ...initialState, retryable: false });
  const [url, setUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const loader = useRef<ReturnType<typeof createSourceMediaLoader> | null>(null);
  const alive = useRef(false);
  const load = useCallback(async (current = loader.current) => {
    if (!current) return;
    setState({ status: 'LOADING', error: null, retryable: false }); setPlaybackError(null); onReadyChange(false);
    try {
      const source = await current.load();
      if (alive.current && source) { setUrl(source); setState({ status: 'READY', error: null, retryable: false }); }
    } catch (reason) {
      if (alive.current) { setUrl(null); setState({ status: 'ERROR', error: sourceMediaError(reason), retryable: true }); }
    }
  }, [onReadyChange]);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    if (!shouldAutoLoad) return () => { alive.current = false; controller.abort(); };
    const current = createSourceMediaLoader(() => apiBlob(`/projects/${encodeURIComponent(projectId)}/media/file`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]),
    }), URL.createObjectURL, URL.revokeObjectURL);
    loader.current = current;
    scheduleSourceMediaAutoLoad(controller.signal, () => load(current));
    return () => { alive.current = false; controller.abort(); current.dispose(); if (loader.current === current) loader.current = null; };
  }, [load, projectId, mediaType, mediaSize, metadataState, shouldAutoLoad]);
  const events = {
    onLoadedMetadata: () => onReadyChange(true),
    onTimeUpdate: () => onTimeChange(playerRef.current?.paused ? Number.NaN : playerRef.current?.currentTime ?? Number.NaN),
    onSeeked: () => onTimeChange(playerRef.current?.paused ? Number.NaN : playerRef.current?.currentTime ?? Number.NaN),
    onPlay: () => onTimeChange(playerRef.current?.currentTime ?? 0),
    onPause: () => onTimeChange(Number.NaN),
    onEnded: () => onTimeChange(Number.NaN),
    onError: () => { setPlaybackError('Không thể phát tệp này. Định dạng hoặc codec có thể không được trình duyệt hỗ trợ.'); onReadyChange(false); onTimeChange(Number.NaN); },
  };
  const video = url && <video ref={(node) => { playerRef.current = node; }} className="source-player__video" src={url} controls playsInline preload="metadata" aria-label="Phát video nguồn" {...events} />;
  return <div className="source-player">
    {mediaType !== 'VIDEO' && <div className="source-player__audio-heading"><span className="source-player__audio-icon"><Icon name="wave" width="24" height="24" /></span><span>Âm thanh nguồn</span></div>}
    {state.status === 'LOADING' && <div className="source-player__state" role="status" aria-busy="true"><span className="source-player__loading" aria-hidden="true" />Đang tải phương tiện...</div>}
    {state.status === 'EMPTY' && <p className="source-player__state" role="status">Dự án chưa có tệp phương tiện nguồn.</p>}
    {state.status === 'UNKNOWN' && <p className="source-player__state" role="status">Chưa xác định được phương tiện nguồn. Không coi trạng thái này là không có tệp.</p>}
    {state.status === 'ERROR' && <div className="source-player__state source-player__state--error" role="alert"><p>{state.error}</p>{state.retryable && <Button variant="secondary" type="button" onClick={() => void load()}>Thử tải lại</Button>}</div>}
    {url && (mediaType === 'VIDEO' ? framedVideo ? <div className="source-player__video-frame">{video}</div> : video : <audio ref={(node) => { playerRef.current = node; }} src={url} controls preload="metadata" aria-label="Phát âm thanh nguồn" {...events} />)}
    {url && playbackError && <div className="source-player__state source-player__state--error" role="alert"><p>{playbackError}</p><Button variant="secondary" type="button" onClick={() => { setPlaybackError(null); onReadyChange(false); playerRef.current?.load(); }}>Thử phát lại</Button></div>}
  </div>;
}
