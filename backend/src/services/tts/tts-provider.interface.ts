export interface TtsProviderInput {
  text: string;
  language: string;
  voice: string;
  format: 'mp3';
}

export interface TtsProviderResult {
  audio: Uint8Array;
  format: 'mp3';
  mimeType: 'audio/mpeg';
  provider: string;
  model?: string;
}

export interface TtsProvider {
  synthesize(input: TtsProviderInput): Promise<TtsProviderResult>;
}
