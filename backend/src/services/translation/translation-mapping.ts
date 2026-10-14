export function isTranslationMappingCurrent(sources: readonly { _id: { toString(): string } }[], translations: readonly { transcriptSegmentId: { toString(): string }; translatedText: string }[]): boolean {
  const ids = new Set(sources.map(source => source._id.toString()));
  const translatedIds = translations.map(segment => segment.transcriptSegmentId.toString());
  return sources.length > 0 && ids.size === sources.length && translations.length === sources.length && new Set(translatedIds).size === sources.length && translations.every(segment => ids.has(segment.transcriptSegmentId.toString()) && Boolean(segment.translatedText.trim()));
}
