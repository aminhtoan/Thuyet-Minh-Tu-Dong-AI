import { groupTranscriptSegments } from '../transcript/transcriptPresentation.mjs';

// API index is source.sequence - 1, not the current array position.
export function mapTranslationSegments(translationId, segments, sources) {
  return segments.map(segment => {
    const matches = sources.filter(source => source.sequence === segment.index + 1);
    if (!Number.isInteger(segment.index) || segment.index < 0 || matches.length !== 1) throw new Error('Bản dịch không khớp phân đoạn bản gốc. Vui lòng tải lại bản ghi và bản dịch.');
    const source = matches[0];
    const verified = typeof source.backendSegmentId === 'string' && source.backendSegmentId === segment.sourceSegmentId;
    return { id: `${translationId}-${segment.index}`, transcriptSegmentId: verified ? source.id : '', sequence: source.sequence, startTime: source.startTime, endTime: source.endTime, translatedText: segment.text };
  });
}

// Derived UI only: IDs, timestamps and persisted segments are never rewritten.
export function buildTranslationPresentation(sources, translations) {
  let groups;
  try { groups = groupTranscriptSegments(sources); }
  catch {
    return { rows: sources.map(source => ({ source })), notice: 'Mốc thời gian bản gốc không hợp lệ. Không nhóm nội dung; vui lòng tải lại bản ghi.' };
  }
  if (!translations) return { rows: groups.map(source => ({ source })), notice: null };
  const sourceIds = new Set(sources.map(source => source.id));
  const translationIds = new Set(translations.map(segment => segment.id));
  const bySource = new Map();
  for (const source of sources) {
    const matches = translations.filter(segment => segment.transcriptSegmentId === source.id);
    if (matches.length !== 1) continue;
    const segment = matches[0];
    if (segment.sequence === source.sequence && segment.startTime === source.startTime && segment.endTime === source.endTime && typeof segment.translatedText === 'string' && segment.translatedText.trim()) bySource.set(source.id, segment);
  }
  const aligned = sourceIds.size === sources.length && translationIds.size === translations.length && translations.length === sources.length && bySource.size === sources.length;
  if (!aligned) return {
    rows: sources.map(source => ({ source, translation: bySource.get(source.id) })),
    notice: 'Chưa thể nhóm bản dịch an toàn: mapping phân đoạn thiếu, trùng hoặc không khớp bản gốc. Giữ từng phân đoạn; nội dung chưa xác minh không được ghép.',
  };
  const positions = new Map(sources.map((source, index) => [source.id, index]));
  return { rows: groups.map((source, index) => {
    const start = positions.get(source.id);
    const end = index + 1 < groups.length ? positions.get(groups[index + 1].id) : sources.length;
    const members = sources.slice(start, end).map(member => bySource.get(member.id));
    return { source, translation: { ...members[0], sequence: source.sequence, startTime: source.startTime, endTime: source.endTime, translatedText: members.map(member => member.translatedText).join(' ') } };
  }), notice: null };
}
