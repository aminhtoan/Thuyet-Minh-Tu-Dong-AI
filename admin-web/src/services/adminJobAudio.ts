import { environment } from '../config/env';
import { adminSession } from '../lib/api';

export async function loadJobAudio(jobId: string, signal: AbortSignal): Promise<Blob> {
  if (!/^[a-f\d]{24}$/i.test(jobId)) throw new Error('JOB_AUDIO_UNAVAILABLE');
  const token = adminSession.get()?.accessToken;
  if (!token) throw new Error('AUTH_REQUIRED');
  // No token in URL, redirect, automatic refresh or provider POST.
  const response = await fetch(environment.apiBaseUrl + '/admin/jobs/' + encodeURIComponent(jobId) + '/audio', {
    method: 'GET', headers: { authorization: 'Bearer ' + token }, signal, redirect: 'error', cache: 'no-store',
  });
  if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'audio/mpeg') throw new Error('JOB_AUDIO_UNAVAILABLE');
  return response.blob();
}
