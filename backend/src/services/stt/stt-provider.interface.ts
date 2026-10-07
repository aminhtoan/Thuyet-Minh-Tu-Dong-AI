export interface SttSegment { start: number; end: number; text: string }
export interface SttResult { text: string; language?: string; duration?: number; segments: SttSegment[] }
export interface SttInput { filePath: string; mimeType: string; language: string }
export interface SttProvider { transcribe(input: SttInput): Promise<SttResult> }
