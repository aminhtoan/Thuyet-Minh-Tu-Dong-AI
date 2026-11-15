export type PublicAudioOption = { optionId: string; type: 'ORIGINAL_AUDIO' | 'AI_NARRATION'; code: string; name: string; flag?: string; projectId: string; narrationId?: string; audioUrl: string };
export type PublicAudioGuide = { key: string; title: string; description?: string; languages: PublicAudioOption[] };
export function publicAudioOptionKey(option: Partial<PublicAudioOption>): string;
export function publicAudioOptionLabel(option: Partial<PublicAudioOption>): string;
export function publicAudioUrl(option: PublicAudioOption, apiBase: string): string | null;
export function parsePublicGuides(payload: unknown): PublicAudioGuide[];
export function fetchPublicGuides(apiBase: string, signal: AbortSignal, fetcher?: typeof fetch): Promise<PublicAudioGuide[]>;
