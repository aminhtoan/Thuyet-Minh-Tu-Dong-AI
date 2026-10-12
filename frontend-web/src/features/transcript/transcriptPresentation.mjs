// Display-only projection: never mutate the source transcript or write grouped data.
const sentenceEnd = /[.!?…。！？]["'”’»)]*$/u;
const punctuationOnly = /^[,.;:!?…。，！？]+$/u;
export function groupTranscriptSegments(segments) {
  let previousEnd = 0;
  for (const segment of segments) {
    if (!Number.isFinite(segment.startTime) || !Number.isFinite(segment.endTime) || segment.startTime < previousEnd || segment.endTime <= segment.startTime || typeof segment.text !== 'string' || !segment.text.trim()) {
      throw new Error('Mốc thời gian của bản ghi không hợp lệ. Vui lòng tải lại bản ghi.');
    }
    previousEnd = segment.endTime;
  }
  const groups = []; let current = []; let characters = 0;
  const flush = () => {
    if (!current.length) return;
    const first = current[0]; const last = current.at(-1);
    const text = current.reduce((result, s) => result + (result && !punctuationOnly.test(s.text.trim()) ? ' ' : '') + s.text.trim(), '');
    groups.push({ ...first, sequence: groups.length + 1, startTime: first.startTime, endTime: last.endTime, text });
    current = []; characters = 0;
  };
  for (const segment of segments) {
    // Existing sentence/phrase segments remain separate; only group word-like runs.
    if (/\s/u.test(segment.text.trim())) { flush(); groups.push({ ...segment, sequence: groups.length + 1 }); continue; }
    if (current.length && (segment.startTime - current.at(-1).endTime >= 0.6 || current.length >= 18 || segment.endTime - current[0].startTime > 8 || characters + segment.text.length > 120)) flush();
    current.push(segment); characters += segment.text.length;
    if (sentenceEnd.test(segment.text.trim())) flush();
  }
  flush(); return groups;
}

export function formatPreciseTimestamp(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const milliseconds = Math.round(seconds * 1000);
  const minutes = Math.floor(milliseconds / 60000);
  const rest = milliseconds % 60000;
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(rest / 1000)).padStart(2, '0')}.${String(rest % 1000).padStart(3, '0')}`;
}
