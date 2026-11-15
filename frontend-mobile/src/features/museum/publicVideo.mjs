export function publicVideoUrl(video, apiBase) {
  try {
    const base = new URL(apiBase), url = new URL(video.fileUrl, base.origin);
    const match = /^\/api\/published-video-narrations\/public\/projects\/([a-f\d]{24})\/results\/([a-f\d]{24})\/file$/i.exec(url.pathname);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin || url.username || url.password || url.search || url.hash
      || !match || match[1] !== video.projectId || match[2] !== video.id) return undefined;
    return url.href;
  } catch { return undefined; }
}
export function parsePublishedVideos(payload, apiBase) {
  if (payload?.success !== true || !Array.isArray(payload.data?.videos)) throw Error('PUBLIC_VIDEO_INVALID_RESPONSE');
  const videos = payload.data.videos.filter(video => video && typeof video.id === 'string' && typeof video.projectId === 'string'
    && /^[a-f\d]{24}$/i.test(video.id) && /^[a-f\d]{24}$/i.test(video.projectId)
    && video.artifactType === 'VIDEO' && video.sourceMediaType === 'VIDEO' && video.mimeType === 'video/mp4'
    && typeof video.title === 'string' && video.title.trim() && typeof video.languageCode === 'string'
    && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(video.languageCode) && Number.isFinite(video.duration) && video.duration > 0
    && typeof video.fileUrl === 'string' && publicVideoUrl(video, apiBase));
  return videos.filter(video => videos.filter(other => other.id === video.id).length === 1);
}
export async function fetchPublishedVideos(apiBase, signal, fetcher = fetch) {
  const response = await fetcher(`${apiBase.replace(/\/+$/, '')}/published-video-narrations/public`, { signal, cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw Error('PUBLIC_VIDEO_UNAVAILABLE');
  return parsePublishedVideos(await response.json(), apiBase);
}
export async function checkPublishedVideo(video, apiBase, signal, fetcher = fetch) {
  const uri = publicVideoUrl(video, apiBase);
  if (!uri) throw Error('PUBLIC_VIDEO_INVALID_URL');
  const response = await fetcher(uri, { method: 'HEAD', signal, cache: 'no-store', credentials: 'omit', redirect: 'error' });
  if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'video/mp4') throw Error('PUBLIC_VIDEO_UNAVAILABLE');
  return uri;
}
export function publishedVideoLanguage(code) {
  return ({ vi: 'Tiếng Việt', en: 'Tiếng Anh', th: 'Tiếng Thái', ko: 'Tiếng Hàn', 'zh-cn': 'Tiếng Trung giản thể', ja: 'Tiếng Nhật' })[code.toLowerCase()] ?? code;
}

// Keep asynchronous replacement, status events and native cleanup in one owned lifetime.
export function loadPublicVideo(player, video, apiBase, signal, onState, fetcher = fetch) {
  const request = new AbortController();
  let disposed = false, subscription;
  let timer;
  const clearSource = () => {
    try { player.pause(); void player.replaceAsync(null).catch(() => {}); } catch { /* hook may already have released the player */ }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true; request.abort(); clearTimeout(timer);
    try { subscription?.remove(); } catch { /* hook may already have released the subscription */ }
    signal.removeEventListener('abort', dispose); clearSource();
  };
  const fail = () => { if (!disposed) { onState('ERROR'); dispose(); } };
  const waiting = () => { clearTimeout(timer); timer = setTimeout(fail, 15000); };
  if (signal.aborted) { dispose(); return dispose; }
  signal.addEventListener('abort', dispose, { once: true });
  onState('LOADING'); waiting();
  subscription = player.addListener('statusChange', ({ status }) => {
    if (disposed) return;
    if (status === 'error') fail();
    else if (status === 'readyToPlay') { clearTimeout(timer); onState('READY'); }
    else if (status === 'loading') { onState('LOADING'); waiting(); }
  });
  void (async () => {
    try {
      const uri = await checkPublishedVideo(video, apiBase, request.signal, fetcher);
      if (disposed) return;
      await player.replaceAsync({ uri, useCaching: false, headers: { 'Cache-Control': 'no-store' } });
      if (disposed) { clearSource(); return; }
      player.pause(); // Loading a source must never start playback.
      if (player.status === 'readyToPlay') { clearTimeout(timer); onState('READY'); }
      else if (player.status === 'error') fail();
    } catch { fail(); }
  })();
  return dispose;
}
