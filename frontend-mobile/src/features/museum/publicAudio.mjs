export const publicAudioOptionKey = option => option.optionId || `${option.type || 'AI_NARRATION'}:${option.narrationId || option.projectId}:${option.code}`;
export const publicAudioOptionLabel = option => `${option.type === 'ORIGINAL_AUDIO' ? 'Âm thanh gốc' : 'Thuyết minh AI'} — ${option.name || option.code}`;

export function publicAudioUrl(option, apiBase) {
  try {
    const base = new URL(apiBase);
    const url = new URL(option.audioUrl, base.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin || url.username || url.password || url.search || url.hash) return null;
    const id = '[a-f0-9]{24}';
    const pattern = option.type === 'ORIGINAL_AUDIO' ? `^/api/published-original-audio/${id}/audio$` : `^/api/projects/public-audio/${id}/${id}$`;
    return new RegExp(pattern, 'i').test(url.pathname) ? url.href : null;
  } catch { return null; }
}

export function parsePublicGuides(payload) {
  if (!payload?.success || !Array.isArray(payload.data?.guides)) throw Error('PUBLIC_AUDIO_INVALID_RESPONSE');
  return payload.data.guides.map(guide => {
    if (typeof guide.key !== 'string' || typeof guide.title !== 'string' || !Array.isArray(guide.languages)) throw Error('PUBLIC_AUDIO_INVALID_RESPONSE');
    const seen = new Set();
    const languages = guide.languages.map(option => {
      if (!['ORIGINAL_AUDIO', 'AI_NARRATION', undefined].includes(option.type) || typeof option.code !== 'string' || typeof option.name !== 'string'
        || typeof option.projectId !== 'string' || typeof option.audioUrl !== 'string'
        || option.optionId !== undefined && (typeof option.optionId !== 'string' || !option.optionId.trim())) throw Error('PUBLIC_AUDIO_INVALID_OPTION');
      const key = publicAudioOptionKey(option);
      if (seen.has(key)) throw Error('PUBLIC_AUDIO_DUPLICATE_OPTION');
      seen.add(key);
      return { ...option, optionId: key, type: option.type || 'AI_NARRATION' };
    });
    return { key: guide.key, title: guide.title, description: typeof guide.description === 'string' ? guide.description : '', languages };
  });
}

export async function fetchPublicGuides(apiBase, signal, fetcher = fetch) {
  const response = await fetcher(`${apiBase.replace(/\/+$/, '')}/projects/public-audio-guides`, { signal });
  if (!response.ok) throw Error('PUBLIC_AUDIO_UNAVAILABLE');
  return parsePublicGuides(await response.json());
}
