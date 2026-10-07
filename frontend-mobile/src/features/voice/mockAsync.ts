export type MockOptions = { signal?: AbortSignal; fail?: boolean };

export function waitForMock(ms: number, { signal, fail }: MockOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Đã hủy thao tác.')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new Error('Đã hủy thao tác.')); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      if (fail) reject(new Error('Không thể hoàn tất thao tác mô phỏng. Vui lòng thử lại.'));
      else resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
