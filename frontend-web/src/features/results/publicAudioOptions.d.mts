type Option = { optionId?: string; type?: 'ORIGINAL_AUDIO' | 'AI_NARRATION'; narrationId?: string; projectId: string; code: string; name: string };
export function publicAudioOptionKey(option: Option): string;
export function publicAudioOptionLabel(option: Option): string;
