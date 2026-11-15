import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AdminDialog } from '../common/AdminDialog';
import { videoPublicationService, type GeneratedVideo, type VideoPublicationState } from '../../services/videoPublicationService';
import './VideoPublication.css';

export function VideoPublicationItem({ result }: { result: GeneratedVideo }) {
  const [state, setState] = useState<VideoPublicationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'VERIFY' | 'SAVE' | null>(null);
  const [validation, setValidation] = useState<'UNCHECKED' | 'VALID' | 'INVALID'>('UNCHECKED');
  const [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const lock = useRef(false), controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setState(null); setError(null); setMessage(null); setValidation('UNCHECKED');
    try { const value = await videoPublicationService.get(result.projectId, result.id, signal); if (!signal.aborted) setState(value); }
    catch { if (!signal.aborted) setError('Không thể tải trạng thái công khai video. Vui lòng tải lại.'); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [result.projectId, result.id]);
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    void Promise.resolve().then(() => { if (!request.signal.aborted) return refresh(request.signal); });
    return () => { request.abort(); controller.current?.abort(); };
  }, [refresh]);
  function requestSignal() { controller.current?.abort(); const request = new AbortController(); controller.current = request; return request.signal; }
  async function verify() {
    if (lock.current || !state) return;
    lock.current = true; setBusy('VERIFY'); setError(null); setMessage(null); setValidation('UNCHECKED');
    const signal = requestSignal();
    try { await videoPublicationService.verify(result, signal); if (!signal.aborted) setValidation('VALID'); }
    catch { if (!signal.aborted) { setValidation('INVALID'); setError('Không thể xác minh MP4: tệp có thể thiếu, hỏng, đã cũ hoặc kết nối bị lỗi. Tải lại rồi kiểm tra lại.'); } }
    finally { lock.current = false; if (!signal.aborted) setBusy(null); }
  }
  async function update(enabled: boolean) {
    if (lock.current || !state || (enabled && validation !== 'VALID')) return;
    lock.current = true; setBusy('SAVE'); setConfirm(false); setError(null); setMessage(null);
    const signal = requestSignal();
    try {
      const value = await videoPublicationService.set(state, enabled, signal);
      if (!signal.aborted) { setState(value); setMessage(enabled ? 'Đã bật công khai video MP4.' : 'Đã tắt công khai video MP4.'); }
    } catch {
      if (!signal.aborted) { setState(null); setValidation('UNCHECKED'); setError('Backend chưa xác nhận thao tác hoặc đã từ chối. Tải lại trạng thái trước khi thử tiếp; không tự gửi lại yêu cầu.'); }
    } finally { lock.current = false; if (!signal.aborted) setBusy(null); }
  }
  const label = loading ? 'Đang tải trạng thái…' : !state ? 'Chưa xác minh trạng thái'
    : validation === 'INVALID' ? 'MP4 không hợp lệ / chưa xác minh được'
    : state.enabled ? 'Đã bật công khai' : validation === 'VALID' ? 'MP4 đã kiểm tra — chưa công khai' : 'Đã tạo MP4 — chưa công khai';
  return <article className="video-publication__item" aria-busy={loading || Boolean(busy)} aria-labelledby={`video-title-${result.id}`}>
    <h3 id={`video-title-${result.id}`}>Video thuyết minh MP4 · {result.targetLanguage.toUpperCase()}</h3>
    <p role="status" aria-live="polite">{busy === 'VERIFY' ? 'Đang tải và kiểm tra MP4…' : busy === 'SAVE' ? 'Backend đang xác minh và lưu công khai video…' : label}</p>
    <p id={`video-help-${result.id}`}>{validation === 'VALID'
      ? 'Kiểm tra trình duyệt đã đạt. Backend kiểm tra đầy đủ tệp và phiên bản khi bật công khai.'
      : 'Kiểm tra MP4 trước khi bật công khai. Trạng thái bật/tắt là cấu hình; Backend vẫn xác minh hiệu lực ở mỗi lượt phát.'}</p>
    <label className="video-publication__toggle"><input type="checkbox" checked={state?.enabled === true}
      aria-describedby={`video-help-${result.id}`} disabled={loading || Boolean(busy) || !state || (!state.enabled && validation !== 'VALID')}
      onChange={event => { if (event.target.checked) setConfirm(true); else void update(false); }} /> Cho phép công khai video MP4</label>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="video-publication__actions">
      <Button variant="secondary" disabled={loading || Boolean(busy) || !state} onClick={() => void verify()}>Kiểm tra MP4</Button>
      <Button variant="secondary" disabled={loading || Boolean(busy)} onClick={() => { if (!lock.current) void refresh(requestSignal()); }}>Tải lại trạng thái</Button>
    </div>
    <AdminDialog open={confirm} onClose={() => setConfirm(false)} labelledBy={`video-confirm-${result.id}`} describedBy={`video-description-${result.id}`} busy={Boolean(busy)}>
      <h2 id={`video-confirm-${result.id}`}>Công khai video thuyết minh?</h2>
      <p id={`video-description-${result.id}`}>Khách không đăng nhập có thể xem MP4 được tạo cho bản {result.targetLanguage.toUpperCase()} này khi Backend xác minh thành công. Thao tác không công khai video nguồn và không thay đổi duyệt âm thanh.</p>
      <div className="video-publication__actions"><Button variant="secondary" disabled={Boolean(busy)} onClick={() => setConfirm(false)}>Hủy</Button>
        <Button disabled={Boolean(busy) || validation !== 'VALID' || !state} onClick={() => void update(true)}>Xác nhận công khai video</Button></div>
    </AdminDialog>
  </article>;
}

export function VideoPublication({ projectId }: { projectId: string }) {
  const [results, setResults] = useState<GeneratedVideo[] | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setLoading(true); setResults(null); setError(null);
    try { const value = await videoPublicationService.list(projectId, request.signal); if (!request.signal.aborted) setResults(value); }
    catch { if (!request.signal.aborted) setError('Không thể tải danh sách MP4. Vui lòng thử lại.'); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }, [projectId]);
  useEffect(() => {
    let disposed = false;
    void Promise.resolve().then(() => { if (!disposed) return load(); });
    return () => { disposed = true; controller.current?.abort(); };
  }, [load]);
  return <Card><section className="video-publication" aria-labelledby="video-publication-title" aria-busy={loading}>
    <h2 id="video-publication-title">Công khai video thuyết minh</h2>
    <p>Quản lý riêng MP4 do Backend tạo. Duyệt âm thanh AI không tự bật công khai video.</p>
    {loading && <p role="status">Đang tải video MP4…</p>}
    {error && <><p role="alert">{error}</p><Button variant="secondary" onClick={() => void load()}>Thử lại</Button></>}
    {!loading && results?.length === 0 && <p role="status">Chưa có MP4 hiện hành. Cần tạo video thuyết minh thành công; kết quả cũ hoặc sai phiên bản không được liệt kê.</p>}
    {results?.map(result => <VideoPublicationItem key={result.id} result={result} />)}
  </section></Card>;
}
