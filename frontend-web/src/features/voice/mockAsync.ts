export type MockOptions = { signal?: AbortSignal; fail?: boolean };

export function waitForMock(ms: number, { signal, fail }: MockOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Operation cancelled.')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new Error('Operation cancelled.')); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      if (fail) reject(new Error('Unable to complete this mock operation. Please retry.'));
      else resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
