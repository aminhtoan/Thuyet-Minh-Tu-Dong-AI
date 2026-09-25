import type { DocumentPickerAsset } from 'expo-document-picker';
import type { LanguageCode } from './types';

export type UploadOptions = { projectName: string; sourceLanguage: LanguageCode; file: DocumentPickerAsset; signal: AbortSignal; onProgress: (progress: number) => void; failAt?: number };

function waitForStep(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Upload cancelled')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new Error('Upload cancelled')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, 280);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function uploadProjectMedia({ signal, onProgress, failAt }: UploadOptions): Promise<void> {
  onProgress(0);
  for (const progress of [15, 32, 58, 76, 100]) {
    await waitForStep(signal);
    if (signal.aborted) throw new Error('Upload cancelled');
    if (failAt && progress >= failAt) throw new Error('Mock upload failed. Please retry.');
    onProgress(progress);
  }
}
