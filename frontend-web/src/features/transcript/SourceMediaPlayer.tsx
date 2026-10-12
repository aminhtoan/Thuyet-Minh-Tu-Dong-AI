import { useEffect, useRef, useState, type RefObject } from 'react';
import { apiBlob } from '../../lib/api';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { createSourceMediaLoader, sourceMediaError } from './sourcePlayback.mjs';

type Props = { projectId: string; mediaType?: string; playerRef: RefObject<HTMLMediaElement | null>; onTimeChange: (time: number) => void; onReadyChange: (ready: boolean) => void };
export function SourceMediaPlayer({ projectId, mediaType, playerRef, onTimeChange, onReadyChange }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loader = useRef<ReturnType<typeof createSourceMediaLoader> | null>(null);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    const current = createSourceMediaLoader(() => apiBlob(`/projects/${encodeURIComponent(projectId)}/media/file`, { signal: controller.signal }), URL.createObjectURL, URL.revokeObjectURL);
    loader.current = current;
    return () => { alive.current = false; controller.abort(); current.dispose(); };
  }, [projectId]);
  async function load() {
    if (loading) return;
    setLoading(true); setError(null); onReadyChange(false);
    try { const source = await loader.current?.load(); if (alive.current && source) setUrl(source); }
    catch (reason) { if (alive.current) setError(sourceMediaError(reason)); }
    finally { if (alive.current) setLoading(false); }
  }
  const events = {
    onLoadedMetadata: () => onReadyChange(true),
    onTimeUpdate: () => onTimeChange(playerRef.current?.paused ? Number.NaN : playerRef.current?.currentTime ?? Number.NaN),
    onSeeked: () => onTimeChange(playerRef.current?.paused ? Number.NaN : playerRef.current?.currentTime ?? Number.NaN),
    onPlay: () => onTimeChange(playerRef.current?.currentTime ?? 0),
    onPause: () => onTimeChange(Number.NaN),
    onEnded: () => onTimeChange(Number.NaN),
    onError: () => { setError('Không thể phát tệp này. Định dạng hoặc codec có thể không được trình duyệt hỗ trợ.'); onReadyChange(false); onTimeChange(Number.NaN); },
  };
  return <div className="source-player">
    {mediaType !== 'VIDEO' && <div className="source-player__audio-heading"><span className="source-player__audio-icon"><Icon name="wave" width="24" height="24" /></span><span>Âm thanh nguồn</span></div>}
    {!url && <Button type="button" loading={loading} onClick={() => void load()}>{error ? 'Thử tải lại phương tiện' : 'Tải phương tiện để phát'}</Button>}
    {loading && <p role="status">Đang tải phương tiện nguồn...</p>}
    {error && <p role="alert">{error}</p>}
    {url && (mediaType === 'VIDEO' ? <video ref={(node) => { playerRef.current = node; }} className="source-player__video" src={url} controls playsInline preload="metadata" aria-label="Phát video nguồn" {...events} /> : <audio ref={(node) => { playerRef.current = node; }} src={url} controls preload="metadata" aria-label="Phát âm thanh nguồn" {...events} />)}
    {url && error && <Button variant="secondary" type="button" onClick={() => { setError(null); onReadyChange(false); playerRef.current?.load(); }}>Thử phát lại</Button>}
    {!url && !loading && <p>MP3/MP4 được tải qua phiên đăng nhập bảo vệ. Không tự động phát.</p>}
  </div>;
}
