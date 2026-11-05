import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { simplePreflightView, type SimplePreflightView } from './simplePreflightView.mjs';

export function CustomerSimplePreflight({ projectId, targetLanguage = 'en' }: { projectId: string; targetLanguage?: string }) {
  const [view, setView] = useState<SimplePreflightView | null>(null);
  const [busy, setBusy] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function check() {
    if (!import.meta.env.DEV || operation.current || !targetLanguage) return;
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setView(null);
    try {
      const result = await api<unknown>(`/projects/${projectId}/translations/simple-preflight?targetLanguage=${encodeURIComponent(targetLanguage)}`, { method: 'GET', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }, false);
      if (!controller.signal.aborted) setView(simplePreflightView(result, undefined, targetLanguage));
    } catch (error) {
      if (!controller.signal.aborted) setView(simplePreflightView(undefined, error instanceof ApiError ? error.code : 'UNEXPECTED'));
    } finally {
      if (!controller.signal.aborted) { setBusy(false); operation.current = null; }
    }
  }
  if (!import.meta.env.DEV) return null;
  return <details className="translation-preflight">
    <summary>Thông tin kỹ thuật · Kiểm tra điều kiện SIMPLE</summary>
    <Card className="translation-preflight__content">
    <h2>Kiểm tra điều kiện SIMPLE</h2>
    <p>Chỉ đọc dữ liệu. Không gọi AI, không tự bật dịch.</p>
    <Button variant="secondary" loading={busy} disabled={busy || !targetLanguage} onClick={() => void check()}>Kiểm tra SIMPLE (không gọi AI)</Button>
    {!targetLanguage && <p>Chọn ngôn ngữ đích trước khi kiểm tra.</p>}
    <div role="status" aria-live="polite" aria-atomic="true">
      <p>{busy ? 'Đang kiểm tra…' : view ? `${view.status} — ${view.message}` : 'Chưa kiểm tra điều kiện SIMPLE.'}</p>
    </div>
    {view && <dl className="translation-preflight__data">{view.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    </Card>
  </details>;
}
