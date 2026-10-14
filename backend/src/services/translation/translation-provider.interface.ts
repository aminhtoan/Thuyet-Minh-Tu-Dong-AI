export interface TranslationProviderSegment {
  index: number;
  text: string;
  sourceSegmentId?: string;
  startTime?: number;
  endTime?: number;
}

export interface TranslationProviderInput {
  fullText?: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments: TranslationProviderSegment[];
}

export interface TranslationProviderResult {
  sourceLanguage: string;
  targetLanguage: string;
  segments: TranslationProviderSegment[];
}

export interface TranslationProvider {
  translate(input: TranslationProviderInput): Promise<TranslationProviderResult>;
}
