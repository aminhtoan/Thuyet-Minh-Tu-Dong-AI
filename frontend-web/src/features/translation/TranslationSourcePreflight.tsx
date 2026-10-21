import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { sourcePreflightView } from './sourcePreflight.mjs';
import type { SourcePreflightView } from './sourcePreflight.mjs';

export function TranslationSourcePreflight({ projectId, children }: { projectId: string; children: (blockGeneration: boolean) => ReactNode }) {
  const [view, setView] = useState<SourcePreflightView | null>(null);
  const [busy, setBusy] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function check() {
    if (operation.current || !import.meta.env.DEV) return;
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setView(null);
    try {
      const data = await api<unknown>(`/projects/${projectId}/translations/read-only-diagnostic`, { method: 'GET', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }, false);
      if (!controller.signal.aborted) setView(sourcePreflightView(data));
    } catch (error) { if (!controller.signal.aborted) setView(sourcePreflightView(undefined, error instanceof ApiError ? error.code : 'UNEXPECTED')); }
    finally { if (!controller.signal.aborted) { operation.current = null; setBusy(false); } }
  }
  if (!import.meta.env.DEV) return <>{children(false)}</>;
  return <>
    <Card>
      <p><strong>Kiểm tra nguồn trước khi dịch tiếng Anh</strong></p>
      <p>Chỉ đọc dữ liệu, không gọi AI. Kiểm tra đạt không tự mở khóa chức năng dịch.</p>
      <Button variant="secondary" disabled={busy} loading={busy} onClick={() => void check()}>Kiểm tra nguồn</Button>
      <div role="status" aria-live="polite" aria-atomic="true">
        <p>{busy ? 'Đang kiểm tra nguồn…' : view?.message ?? 'Chưa kiểm tra nguồn của dự án này.'}</p>
        {view?.bytes != null && <p>Kích thước nguồn: {view.bytes.toLocaleString('vi-VN')} bytes / Giới hạn: {view.cap?.toLocaleString('vi-VN')} bytes.</p>}
        {view?.segments != null && <p>Số phân đoạn: {view.segments.toLocaleString('vi-VN')} / Giới hạn: {view.segmentLimit?.toLocaleString('vi-VN')}.</p>}
        {view?.atLeast != null && <p>Ít nhất {view.atLeast.toLocaleString('vi-VN')} phân đoạn; giới hạn 10.000.</p>}
        {view?.notice && <p>{view.notice}</p>}
      </div>
      {view?.blocked && <Link className="button button--secondary button--md" to="/projects/new">Tạo dự án với video khác</Link>}
    </Card>
    {children(true)}
  </>;
}
