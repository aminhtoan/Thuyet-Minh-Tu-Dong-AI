export interface TranslationProviderSegment {
  index: number;
  text: string;
}

export interface TranslationProviderInput {
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
