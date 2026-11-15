export const publicAudioOptionKey = option => option.optionId || `${option.type || 'AI_NARRATION'}:${option.narrationId || option.projectId}:${option.code}`
export const publicAudioOptionLabel = option => `${option.type === 'ORIGINAL_AUDIO' ? 'Âm thanh gốc' : 'Thuyết minh AI'} — ${option.name || option.code}`
