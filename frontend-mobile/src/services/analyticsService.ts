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

    const base = (env.apiBaseUrl || '').replace(/\/+$/, '');
    const res = await fetch(`${base}/analytics/listen`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        platform: 'mobile',
        ...data,
      }),
    });
    if (!res.ok) {
      console.warn('[Analytics] Track listen failed with HTTP', res.status);
    }
  } catch (err) {
    console.warn('[Analytics] Track listen network error:', err);
  }
}
