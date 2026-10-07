export interface MediaProbeResult {
  duration: number;
  format: string;
  fileSize: number;
  hasVideo: boolean;
  hasAudio: boolean;
  width?: number;
  height?: number;
}

export interface ComposeNarrationInput {
  sourceVideoPath: string;
  narrationAudioPath: string;
  outputPath: string;
}

export interface MediaProcessingResult extends MediaProbeResult {
  mimeType: 'video/mp4';
}

export interface MediaProcessor {
  probe(inputPath: string): Promise<MediaProbeResult>;
  composeNarration(input: ComposeNarrationInput): Promise<MediaProcessingResult>;
}
