import type { VideoPlayer } from 'expo-video';
export type PublishedNarrationVideo = {
  id: string; projectId: string; title: string; languageCode: string; duration: number;
  artifactType: 'VIDEO'; sourceMediaType: 'VIDEO'; mimeType: 'video/mp4'; fileUrl: string;
};
export type VideoPhase = 'LOADING' | 'READY' | 'ERROR';
export function publicVideoUrl(video: PublishedNarrationVideo, apiBase: string): string | undefined;
export function parsePublishedVideos(payload: unknown, apiBase: string): PublishedNarrationVideo[];
export function fetchPublishedVideos(apiBase: string, signal: AbortSignal, fetcher?: typeof fetch): Promise<PublishedNarrationVideo[]>;
export function checkPublishedVideo(video: PublishedNarrationVideo, apiBase: string, signal: AbortSignal, fetcher?: typeof fetch): Promise<string>;
export function publishedVideoLanguage(code: string): string;
export function loadPublicVideo(player: VideoPlayer, video: PublishedNarrationVideo, apiBase: string, signal: AbortSignal,
  onState: (state: VideoPhase) => void, fetcher?: typeof fetch): () => void;
