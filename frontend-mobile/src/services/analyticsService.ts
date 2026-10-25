import { env } from '../config/env';
import { session } from '../lib/api';

export interface TrackListenInput {
  platform?: 'web' | 'mobile';
  projectId?: string;
  narrationId?: string;
  languageCode?: string;
}

export async function trackListen(data: TrackListenInput = {}): Promise<void> {
  try {
    const tokens = await session.get();
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (tokens?.accessToken) {
      headers['authorization'] = `Bearer ${tokens.accessToken}`;
    }

    await fetch(`${env.apiBaseUrl}/analytics/listen`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        platform: 'mobile',
        ...data,
      }),
    });
  } catch {
    // Best-effort: never interrupt mobile audio playback
  }
}
