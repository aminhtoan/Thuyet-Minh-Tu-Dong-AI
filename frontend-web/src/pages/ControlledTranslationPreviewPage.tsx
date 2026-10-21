import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { session } from '../lib/api';
import { createControlledPreviewClient } from '../features/translation/controlledPreviewClient.mjs';
import type { ControlledPreviewDraft, ControlledPreviewStatus, ExecutionReadiness } from '../features/translation/controlledPreviewClient.mjs';
import { formatPreciseTimestamp } from '../features/transcript/transcriptPresentation.mjs';
import '../styles/controlled-translation-preview.css';

export function ControlledTranslationPreviewPage() {
  const { projectId = '' } = useParams();
  const enabled = import.meta.env.DEV && import.meta.env.VITE_CONTROLLED_TRANSLATION_PREVIEW_ENABLED === 'true' && /^[a-f\d]{24}$/i.test(projectId);
  const executionEnabled = import.meta.env.DEV && import.meta.env.VITE_CONTROLLED_TRANSLATION_EXECUTION_ENABLED === 'true';
  const client = useMemo(() => createControlledPreviewClient({ enabled, executionEnabled, projectId, origin: import.meta.env.VITE_CONTROLLED_TRANSLATION_ORIGIN, getToken: () => session.get()?.accessToken }), [enabled, executionEnabled, projectId]);
  const [readiness, setReadiness] = useState<ExecutionReadiness | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<ControlledPreviewStatus | null>(null);
  const [draft, setDraft] = useState<ControlledPreviewDraft | null>(null);
  const [draftId, setDraftId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(); operation.current = controller;
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted || !enabled) return;
      lock.current = true; setBusy(true); setDraft(null); setError(null); setStatus(null);
      const value = await client.status(controller.signal);
      if (!controller.signal.aborted) setStatus(value);
    }).finally(() => { if (!controller.signal.aborted) { lock.current = false; setBusy(false); } });
    return () => { controller.abort(); operation.current?.abort(); lock.current = false; };
  }, [client, enabled, attempt]);
  async function loadDraft(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !status || !enabled) return;
    const controller = new AbortController(); operation.current = controller;
    lock.current = true; setBusy(true); setError(null); setDraft(null);
    try {
      const value = await client.draft(draftId.trim(), status, controller.signal);
      if (!controller.signal.aborted) setDraft(value);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không thể xem bản nháp.'); }
    finally { if (!controller.signal.aborted) { lock.current = false; setBusy(false); } }
  }
  async function checkExecution() {
    if (lock.current || submitted) return;
    const controller = new AbortController(); operation.current = controller;
    lock.current = true; setBusy(true); setConfirmed(false); setReadiness(null);
    try { const result = await client.readiness(controller.signal); if (!controller.signal.aborted) setReadiness(result); }
    finally { if (!controller.signal.aborted) { lock.current = false; setBusy(false); } }
  }
  async function executeOnce() {
    if (lock.current || submitted || !executionEnabled || !confirmed || !readiness?.executionAllowed) return;
    const controller = new AbortController(); operation.current = controller;
    lock.current = true; setSubmitted(true); setBusy(true); setError(null);
    try { const result = await client.execute(readiness, true, controller.signal); if (!controller.signal.aborted) setDraft(result); }
    catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'UNCERTAIN: Không gửi lại yêu cầu.'); }
    finally { if (!controller.signal.aborted) { lock.current = false; setBusy(false); } }
  }
  if (!enabled) return <Card><h1>Không tìm thấy trang</h1><p>Chế độ xem này chưa được bật hoặc dự án không thuộc phạm vi được phép.</p></Card>;
  const canReadDraft = status?.serverReported && status.state !== 'BLOCKED';
  return <div className="controlled-translation-preview">
    <PageHeader title="Kiểm tra bản dịch có kiểm soát" description="Development · Chỉ đọc · Tiếng Việt → Tiếng Anh"
      actions={<Link className="button button--secondary button--md" to={`/projects/${projectId}`}>Chi tiết dự án</Link>} />
    <Card>
      <h2>Trạng thái controlled runtime</h2>
      <div role="status" aria-live="polite" aria-atomic="true">
        {busy ? <p>Đang đọc dữ liệu…</p> : <><p><strong>{status?.state ?? 'Chưa kiểm tra'}</strong>{status && !status.serverReported ? ' — chưa được máy chủ xác nhận' : ''}</p><p>{status?.message}</p></>}
      </div>
      <p>Chỉ thực thi khi operator đã cấp permit và cả hai cổng thực thi được bật riêng. Không tự duyệt bản nháp hoặc chạy TTS/video.</p>
      <Button variant="secondary" disabled={busy} onClick={() => { if (!lock.current) { lock.current = true; setAttempt(n => n + 1); } }}>Kiểm tra lại trạng thái</Button>
    </Card>
    <Card>
      <h2>Thực thi một lần theo phê duyệt</h2>
      <Button variant="secondary" disabled={busy || submitted} onClick={() => void checkExecution()}>Kiểm tra quyền thực thi</Button>
      <p role="status" aria-live="polite">{submitted ? (draft ? 'Đã nhận bản nháp chưa duyệt.' : 'Đã gửi yêu cầu. Không tự gửi lại, kể cả khi mất kết nối.') : readiness?.state ?? 'Chưa kiểm tra quyền thực thi.'}</p>
      {readiness?.scope && <p>Dự án: {readiness.scope.projectId} · Revision {readiness.scope.revision} · vi → en · gemini-3.8-flash · MEDIUM</p>}
      {readiness?.expiresAt && <p>Hết hạn: {new Date(readiness.expiresAt).toLocaleString('vi-VN')}</p>}
      <label className="controlled-translation-preview__confirmation"><input type="checkbox" checked={confirmed} disabled={busy || submitted || !executionEnabled || !readiness?.executionAllowed} onChange={e => setConfirmed(e.target.checked)} /> Tôi xác nhận gửi một yêu cầu dịch có thể phát sinh chi phí, không tự thử lại.</label>
      <Button disabled={busy || submitted || !executionEnabled || !confirmed || !readiness?.executionAllowed} onClick={() => void executeOnce()}>Dịch tiếng Anh một lần</Button>
      {!executionEnabled && <p>Thực thi Web đang tắt trong cấu hình development.</p>}
    </Card>
    <Card>
      <h2>Xem bản nháp GROUPS_V1</h2>
      <form onSubmit={loadDraft} className="controlled-translation-preview__form">
        <div><label htmlFor="controlled-draft-id">Mã bản nháp đã có</label>
          <input id="controlled-draft-id" value={draftId} onChange={e => { setDraftId(e.target.value); setDraft(null); setError(null); }} maxLength={36} autoComplete="off" spellCheck={false} disabled={busy || !canReadDraft} aria-describedby="controlled-draft-note" /></div>
        <Button type="submit" disabled={busy || !canReadDraft || !draftId.trim()}>Xem bản nháp</Button>
      </form>
      <p id="controlled-draft-note">Chỉ nhập mã draft đã tồn tại, không phải permit hay thông tin đăng nhập. Bản nháp chưa được duyệt và có thể hết hạn; không tự tạo lại.</p>
      {error && <p role="alert">{error}</p>}
      {!draft && !busy && !error && <p>Chưa tải bản nháp để xem.</p>}
    </Card>
    {draft && <section aria-label="So sánh các cụm bản nháp">
      <Card><h2>Bản nháp tiếng Anh — chưa duyệt</h2><p>Hết hạn: {new Date(draft.expiresAt).toLocaleString('vi-VN')}</p>
        <p>Nội dung nguồn là snapshot của bản nháp, không phải xác nhận rằng toàn bộ workflow hiện tại là CURRENT.</p></Card>
      {draft.groups.map(group => <Card key={group.groupId}>
        <h3>Cụm {group.sequence} · {formatPreciseTimestamp(group.startTime)} → {formatPreciseTimestamp(group.endTime)}</h3>
        <div className="controlled-translation-preview__columns"><section><h4>Bản gốc tiếng Việt</h4><p>{group.sourceText}</p></section><section><h4>Bản nháp tiếng Anh</h4><p lang="en">{group.translatedText}</p></section></div>
      </Card>)}
    </section>}
  </div>;
}
