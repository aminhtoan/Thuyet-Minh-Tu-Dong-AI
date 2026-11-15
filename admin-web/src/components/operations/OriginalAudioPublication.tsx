import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AdminDialog } from '../common/AdminDialog';
import { ApiError } from '../../lib/api';
import { originalAudioService, originalAudioStatus, type OriginalAudioState } from '../../services/originalAudioService';

export function OriginalAudioPublication({ projectId }: { projectId: string }) {
  const [state, setState] = useState<OriginalAudioState | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false), [error, setError] = useState<string | null>(null);
  const lock = useRef(false), mounted = useRef(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try { const value = await originalAudioService.get(projectId, signal); if (!signal?.aborted && mounted.current) setState(value); }
    catch (reason) { if (!signal?.aborted && mounted.current) { setState(null); setError(reason instanceof ApiError && reason.status === 404
      ? 'Backend chưa hỗ trợ tính năng này hoặc không tìm thấy nguồn. Kiểm tra phiên bản Backend và tải lại.' : 'Không thể xác minh trạng thái công bố. Vui lòng tải lại.'); } }
    finally { if (!signal?.aborted && mounted.current) setLoading(false); }
  }, [projectId]);
  useEffect(() => { mounted.current = true; const controller = new AbortController();
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return refresh(controller.signal); });
    return () => { mounted.current = false; controller.abort(); }; }, [refresh]);
  async function update(enabled: boolean) {
    if (lock.current || !state) return;
    lock.current = true; setBusy(true); setConfirm(false); setError(null);
    try { const value = await originalAudioService.set(projectId, state, enabled); if (mounted.current) setState(value); }
    catch { if (mounted.current) { setState(null); setError('Chưa xác nhận được kết quả thao tác. Bấm Tải lại trạng thái trước khi thử lại; tác vụ có thể vẫn đang xử lý.'); } }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <Card><section className="original-audio-publication" aria-labelledby="original-audio-title" aria-busy={busy || loading}>
    <h2 id="original-audio-title">Âm thanh gốc</h2>
    <p>Cho phép khách tham quan nghe bản âm thanh riêng được trích từ media nguồn của dự án này.</p>
    <label><input type="checkbox" checked={state?.enabled === true} disabled={loading || busy || !state}
      onChange={event => { if (event.target.checked) setConfirm(true); else void update(false); }} /> Cho phép công khai âm thanh gốc</label>
    <p role="status">{busy ? 'Đang xử lý yêu cầu công bố. Âm thanh chỉ có thể phát công khai khi chuẩn bị hoàn tất.'
      : loading ? 'Đang tải trạng thái…' : state ? originalAudioStatus(state.status) : 'Chưa xác minh trạng thái'}</p>
    {state?.status === 'FAILED' && <p role="alert">Không thể chuẩn bị hoặc xác minh bản âm thanh. Tải lại trạng thái; bạn có thể tắt rồi bật lại để thử lại.</p>}
    {error && <p role="alert">{error}</p>}
    <Button variant="secondary" disabled={busy || loading} onClick={() => void refresh()}>Tải lại trạng thái</Button>
    <AdminDialog open={confirm} onClose={() => setConfirm(false)} labelledBy="original-confirm-title" describedBy="original-confirm-description">
      <h2 id="original-confirm-title">Công khai âm thanh gốc?</h2>
      <p id="original-confirm-description">Bạn xác nhận có quyền công bố âm thanh của phiên bản nguồn đang chọn. Khách truy cập không cần đăng nhập sẽ nghe được bản âm thanh sau khi chuẩn bị thành công. Thao tác này không duyệt các bản thuyết minh AI.</p>
      <Button variant="secondary" onClick={() => setConfirm(false)}>Hủy</Button>{' '}
      <Button disabled={busy} onClick={() => void update(true)}>Xác nhận công khai</Button>
    </AdminDialog>
  </section></Card>;
}
