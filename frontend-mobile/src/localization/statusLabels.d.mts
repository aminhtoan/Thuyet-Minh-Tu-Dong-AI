import type { ProcessingStatus, StageStatus } from '../features/processing/types'
import type { ProjectStatus } from '../features/projects/types'
import type { TranscriptStatus } from '../features/transcript/types'
import type { TranslationStatus } from '../features/translation/types'
import type { VoiceEditorStatus } from '../features/voice/types'

export const projectStatusLabels: Readonly<Record<ProjectStatus, string>>
export const transcriptStatusLabels: Readonly<Record<TranscriptStatus, string>>
export const translationStatusLabels: Readonly<Record<TranslationStatus, string>>
export const voiceStatusLabels: Readonly<Record<VoiceEditorStatus, string>>
export const processingStatusLabels: Readonly<Record<ProcessingStatus | StageStatus, string>>
export const workflowStepLabels: readonly ['Tải lên', 'Bản ghi', 'Bản dịch', 'Giọng đọc', 'Tạo thuyết minh', 'Kết quả']
export const displayStatusLabels: Readonly<Record<string, string>>
