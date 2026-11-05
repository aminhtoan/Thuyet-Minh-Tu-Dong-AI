export interface SttSegment { start: number; end: number; text: string }
import type { LanguageDetection, SourceLanguageMode } from '../source-language-contract.js';
export interface SttResult { text: string; language?: string; languageDetection?: LanguageDetection; duration?: number; segments: SttSegment[] }
export interface SttInput { filePath: string; mimeType: string; language?: string; sourceLanguageMode?: SourceLanguageMode }
export interface SttProvider { transcribe(input: SttInput): Promise<SttResult> }
