import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { WorkflowSteps } from '../../components/common/WorkflowSteps';
import { WorkflowReadOnlyNotice } from '../../components/common/WorkflowRouteGuard';
import { PageHeader } from '../../components/layout/PageHeader';
import { Spinner } from '../../components/common/Spinner';
import { voiceService } from '../voice/voiceService';
import { projectRepository } from '../projects/projectRepository';
import { ProjectStatusBadge } from '../projects/ProjectStatusBadge';
import type { Project } from '../projects/types';
import { transcriptService } from '../transcript/transcriptService';
import type { Transcript } from '../transcript/types';
import { formatPreciseTimestamp } from '../transcript/transcriptPresentation.mjs';
import { translationTargetChoices, translationLanguageLabel } from './translationLanguages.mjs';
import { groupTranslationService, type LegacyTranslationDto } from './groupTranslationService';
import { buildTranslationPresentation, mapTranslationSegments } from './translationPresentation.mjs';
import type { GroupDraft, GroupPlan, GroupTranslation, TranslationGroup } from './groupTypes';
import { customerAttemptMessage, type CustomerAttempt } from './customerAttemptPresentation.mjs';
import { customerTargetChoices, customerTargetLabel } from './customerLanguages.mjs';

type Language = { code: string; name: string; nativeName: string };
const message = (error: unknown) => error instanceof Error ? error.message : 'Không thể tải bản dịch. Vui lòng thử lại.';
export function GroupTranslationWorkspace({ project, preferredTarget, canMutate, notice, blockGeneration = false, customerMode = false }: { project: Project; preferredTarget: string; canMutate: boolean; notice: string | null; blockGeneration?: boolean; customerMode?: boolean }) {
  const [params, setParams] = useSearchParams();
  const draftId = params.get('draft');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [target, setTarget] = useState(preferredTarget);
  const [plan, setPlan] = useState<GroupPlan | null>(null);
  const [groups, setGroups] = useState<TranslationGroup[]>([]);
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [saved, setSaved] = useState<GroupTranslation | LegacyTranslationDto | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [busy, setBusy] = useState<'load' | 'preview' | 'approve' | null>('load');
  const [error, setError] = useState<string | null>(null);
  const [planReviewed, setPlanReviewed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reload, setReload] = useState(0);
  const requestKey = useRef<string | null>(null);
  const lock = useRef(false);
  const readEpoch = useRef(0);
  const mounted = useRef(true);
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState<CustomerAttempt | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLHeadingElement>(null);
  const focusResult = useRef(false);
  useEffect(() => {
    if (busy || !focusResult.current) return;
    (error ? feedbackRef.current : statusRef.current)?.focus();
    focusResult.current = false;
  }, [busy, error]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    const epoch = ++readEpoch.current;
    const current = () => active && readEpoch.current === epoch;
    void (async () => {
      await Promise.resolve(); if (!current()) return;
      setBusy('load'); setError(null); setAttempt(null); setPlan(null); setSaved(null); setDraft(null); setGroups([]); setReviewed(false); setPlanReviewed(false); requestKey.current = null;
      const [catalog, source] = await Promise.all([voiceService.getLanguages({ signal: controller.signal }), transcriptService.getTranscript(project.id, { signal: controller.signal })]);
      if (!current()) return;
      const allChoices = translationTargetChoices(catalog, project.sourceLanguage ?? '');
      const choices = customerMode ? customerTargetChoices(allChoices, project.sourceLanguage ?? '') : allChoices;
      setLanguages(choices); setCatalogReady(true); setTranscript(source);
      let effectiveTarget = target;
      if (effectiveTarget && !choices.some(c => c.code === effectiveTarget)) {
        const fallback = choices.find(c => c.code === 'en')?.code || choices[0]?.code || '';
        if (fallback) {
          effectiveTarget = fallback;
          setTarget(fallback);
          const next = new URLSearchParams(params);
          next.set('language', fallback);
          setParams(next, { replace: true });
        }
      }
      if (!effectiveTarget || !choices.some(c => c.code === effectiveTarget) || !source) return;
      const stored = await groupTranslationService.saved(project.id, effectiveTarget, controller.signal);
      if (!current()) return;
      if (stored) { if (stored.targetLanguage !== effectiveTarget || stored.projectId !== project.id) throw new Error('Bản dịch không thuộc ngôn ngữ hoặc dự án đang chọn.'); setSaved(stored); return; }
      if (customerMode) {
        const state = await groupTranslationService.customerState(project.id, controller.signal, effectiveTarget);
        if (!current()) return;
        if ((state.targetLanguage ?? (effectiveTarget === 'en' ? 'en' : null)) !== effectiveTarget) throw new Error('Attempt không thuộc ngôn ngữ đang chọn.');
        setAttempt(state.attempt);
        if (state.draft) { if (state.draft.targetLanguage !== effectiveTarget || state.draft.projectId !== project.id) throw new Error('Bản nháp không thuộc ngôn ngữ hoặc dự án đang chọn.'); setDraft(state.draft); return; }
        if (state.attempt) return; // Includes legacy UNKNOWN: never offer a new POST.
      }
      if (draftId) {
        const restored = await groupTranslationService.draft(project.id, draftId, controller.signal, customerMode ? effectiveTarget : undefined);
        if (!current()) return;
        if (restored.targetLanguage !== effectiveTarget || restored.projectId !== project.id) throw new Error('Bản nháp không thuộc ngôn ngữ hoặc dự án đang chọn.');
        setDraft(restored); return;
      }
      const next = await groupTranslationService.plan(project.id, effectiveTarget, controller.signal);
      if (current()) { if (next.targetLanguage !== effectiveTarget || next.projectId !== project.id) throw new Error('Kế hoạch không thuộc ngôn ngữ hoặc dự án đang chọn.'); setPlan(next); setGroups(next.groups); }
    })().catch(e => { if (current()) setError(message(e)); }).finally(() => { if (current()) setBusy(null); });
    return () => { active = false; controller.abort(); };
  }, [project.id, project.sourceLanguage, target, draftId, reload, customerMode]);

  function changeTarget(value: string) {
    if (lock.current) return;
    ++readEpoch.current;
    setDraft(null); setSaved(null); setPlan(null); setGroups([]); setAttempt(null); setReviewed(false); setPlanReviewed(false); setSubmitted(false); setError(null); setBusy('load'); requestKey.current = null;
    setTarget(value);
    const next = new URLSearchParams(params); next.set('language', value); next.delete('draft'); setParams(next, { replace: true });
  }
  function merge(index: number) {
    if (!canMutate || busy || draft || saved) return;
    setGroups(current => current.flatMap((g, i) => i === index ? [{ ...g, sourceSegmentIds: [...g.sourceSegmentIds, ...current[i + 1]!.sourceSegmentIds], sourceText: `${g.sourceText} ${current[i + 1]!.sourceText}`, endTime: current[i + 1]!.endTime }] : i === index + 1 ? [] : [g]).map((g, i) => ({ ...g, sequence: i + 1 })));
    setPlanReviewed(false); requestKey.current = null;
  }
  async function preview() {
    if (blockGeneration || !canMutate || !plan || !planReviewed || lock.current || busy || draft || saved || (customerMode && (submitted || attempt))) return;
    if (!window.confirm(customerMode
      ? 'Tạo bản dịch nháp bằng AI cho các cụm đã kiểm tra? Thao tác có thể phát sinh chi phí. Bản nháp hợp lệ được lưu trên máy chủ; chỉ sau khi bạn duyệt, bản dịch mới được dùng cho Giọng đọc.'
      : 'Tạo bản dịch nháp bằng AI cho các cụm đã kiểm tra? Thao tác có thể phát sinh chi phí. Bản nháp chỉ nằm trong bộ nhớ máy chủ; chỉ sau khi bạn duyệt, bản dịch mới được lưu vào cơ sở dữ liệu và dùng cho Giọng đọc.')) return;
    focusResult.current = true;
    lock.current = true; setBusy('preview'); setError(null);
    if (customerMode) setSubmitted(true);
    requestKey.current ??= crypto.randomUUID();
    try {
      const value = customerMode ? await groupTranslationService.customerGenerate(project.id, target) : await groupTranslationService.preview(project.id, plan, groups, requestKey.current);
      if (value.targetLanguage !== target || value.projectId !== project.id) throw new Error('Bản nháp trả về không khớp ngôn ngữ hoặc dự án đang chọn. Không gửi lại yêu cầu AI.');
      if (mounted.current) { setDraft(value); setReviewed(false); const next = new URLSearchParams(params); next.set('draft', value.draftId); next.set('language', value.targetLanguage); setParams(next, { replace: true }); }
    } catch (e) { if (mounted.current) {
      requestKey.current = null;
      setError(customerMode ? `${message(e)} Chỉ tải lại dữ liệu; không tự gửi lại yêu cầu AI.` : message(e));
      if (customerMode) setAttempt({ status: 'UNCERTAIN', phase: 'UNKNOWN', diagnosticCode: null, updatedAt: null, canGenerate: false });
    } }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }
  async function approve() {
    if (!canMutate || !draft || !reviewed || busy || lock.current) return;
    if (Date.parse(draft.expiresAt) <= Date.now()) { setError('Bản nháp đã hết hạn. Không tự động dịch lại.'); return; }
    focusResult.current = true;
    lock.current = true; setBusy('approve'); setError(null);
    try {
      const value = await groupTranslationService.approve(project.id, draft);
      if (value.targetLanguage !== target || value.targetLanguage !== draft.targetLanguage || value.projectId !== project.id) throw new Error('Kết quả phê duyệt không khớp ngôn ngữ hoặc dự án đang chọn. Chỉ tải lại dữ liệu.');
      if (mounted.current) { setSaved(value); setDraft(null); setReviewed(false); }
      // Persistence succeeded even if refreshing the project list fails.
      void projectRepository.refresh().catch(() => undefined);
    } catch (e) { if (mounted.current) setError(message(e)); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }
  const groupedSaved = saved?.alignmentFormat === 'GROUPS_V1' ? saved : null;
  const displayGroups = groupedSaved?.groups ?? draft?.groups ?? groups;
  const legacy = saved && saved.alignmentFormat !== 'GROUPS_V1' && transcript ? buildTranslationPresentation(transcript.segments, mapTranslationSegments(saved.id, saved.segments, transcript.segments)) : null;
  const needsAttention = attempt && ['UNCERTAIN', 'FAILED_RESPONSE', 'FAILED_PRE_DISPATCH', 'EXPIRED'].includes(attempt.status);
  const attemptSummary = attempt?.status === 'UNCERTAIN'
    ? 'Chưa xác định yêu cầu trước đã được xử lý hay chưa. Không nhấn Dịch lại để tránh xử lý trùng lặp. Bạn có thể kiểm tra trạng thái hoặc liên hệ hỗ trợ.'
    : customerAttemptMessage(attempt ? { ...attempt, providerHttpStatus: null } : null);
  const generationHint = blockGeneration ? 'Chức năng tạo nháp đang bị chặn. Không tự gửi lại yêu cầu AI.'
    : !canMutate ? 'Dự án đang ở chế độ chỉ đọc.'
      : customerMode && (submitted || attempt) ? 'Yêu cầu đã được gửi hoặc cần được kiểm tra. Chỉ tải lại dữ liệu, không gửi thêm yêu cầu AI.'
        : busy ? 'Vui lòng chờ thao tác hiện tại hoàn tất.'
          : !planReviewed ? 'Đánh dấu xác nhận sau khi kiểm tra các cụm nguồn để tiếp tục.'
            : 'Thao tác tạo nháp có thể phát sinh chi phí. Không tự động duyệt bản dịch.';
  return <>
    <PageHeader title="Bản dịch" description="Kiểm tra nội dung nguồn, xem bản nháp và duyệt bản dịch trước khi sử dụng."
      actions={<Link className="button button--secondary button--md" to={`/projects/${project.id}/transcript`}>Quay lại bản ghi</Link>} />
    <div className="translation-heading"><div><span className="translation-label">DỰ ÁN</span><h2>{project.name}</h2></div>
      <ProjectStatusBadge status={project.status} />
    </div>
    <WorkflowSteps workflow={project.workflow} projectId={project.id} pageStep="TRANSLATION" />
    <WorkflowReadOnlyNotice reason={notice} />
    <div className="group-translation-workspace">
      <div className={`translation-feedback translation-feedback--compact${saved ? ' translation-feedback--success' : customerMode && needsAttention && !busy ? ' translation-feedback--warning' : ''}`} role={customerMode && attempt && !busy ? undefined : 'status'} aria-live={customerMode && attempt && !busy ? undefined : 'polite'} aria-atomic="true">
        <h2 ref={statusRef} tabIndex={-1}>{busy === 'preview' ? 'Đang tạo bản dịch nháp' : busy === 'approve' ? 'Đang lưu bản dịch đã duyệt' : busy === 'load' ? 'Đang tải bản dịch' : saved ? groupedSaved ? 'Bản dịch đã được duyệt' : 'Bản dịch đã lưu' : draft ? 'Bản nháp — chưa duyệt' : attempt ? 'Bản dịch chưa sẵn sàng' : 'Chưa có bản dịch'}</h2>
        <p role={customerMode && attempt && !busy ? needsAttention ? 'alert' : 'status' : undefined} aria-atomic="true">{busy === 'preview' ? 'Đang tạo bản dịch nháp bằng AI. Không gửi thêm yêu cầu hoặc nhấn Dịch lại.' : busy === 'approve' ? 'Đang lưu bản dịch đã duyệt. Vui lòng chờ xác nhận từ máy chủ.' : busy === 'load' ? 'Đang tải bản ghi và bản dịch...' : saved ? groupedSaved ? 'Bản dịch đã lưu và được bạn duyệt để sử dụng cho Giọng đọc.' : 'Bản dịch đã lưu theo định dạng phân đoạn cũ, giữ nguyên dữ liệu.' : draft ? customerMode ? 'Bản nháp đã lưu trên máy chủ, chưa duyệt và chưa dùng được cho Giọng đọc.' : 'Bản nháp — chưa lưu vào cơ sở dữ liệu, chưa dùng được cho Giọng đọc.' : customerMode && attempt ? attemptSummary : 'Chưa có bản dịch đã lưu. Chọn ngôn ngữ và kiểm tra các cụm nguồn trước khi tạo nháp.'}</p>
        {customerMode && attempt && !busy && <><Button variant="secondary" disabled={Boolean(busy)} onClick={() => setReload(n => n + 1)}>Kiểm tra trạng thái</Button><details className="translation-diagnostics"><summary>Chi tiết chẩn đoán</summary><p>{customerAttemptMessage(attempt)}</p><dl><div><dt>Trạng thái</dt><dd>{attempt.status}</dd></div><div><dt>Giai đoạn</dt><dd>{attempt.phase || 'Chưa xác định'}</dd></div>{attempt.providerHttpStatus != null && <div><dt>HTTP</dt><dd>{attempt.providerHttpStatus}</dd></div>}{attempt.diagnosticCode && <div><dt>Mã chẩn đoán</dt><dd>{attempt.diagnosticCode}</dd></div>}</dl></details></>}
      </div>
      {error && <Card className="translation-feedback translation-feedback--error"><div ref={feedbackRef} tabIndex={-1} role="alert"><h2>Không thể hoàn tất thao tác</h2><p>{customerMode ? 'Chưa thể xác nhận kết quả. Hãy kiểm tra trạng thái; không gửi lại yêu cầu dịch.' : error}</p></div>{customerMode && <details className="translation-diagnostics"><summary>Chi tiết chẩn đoán</summary><p>{error}</p></details>}<Button variant="secondary" disabled={Boolean(busy)} onClick={() => setReload(n => n + 1)}>Tải lại dữ liệu (không gọi AI)</Button></Card>}
      <Card className="translation-language-card"><div><span className="translation-label">Ngôn ngữ nguồn</span><p className="translation-source-language">{translationLanguageLabel({ code: project.sourceLanguage ?? '', name: project.sourceLanguage ?? 'Chưa xác định', nativeName: '' })}</p></div>
        <div className="translation-language-field"><label htmlFor="group-target">Ngôn ngữ đích</label><select id="group-target" value={target} disabled={busy === 'preview' || busy === 'approve'} onChange={e => changeTarget(e.target.value)}>
          <option value="">Chọn ngôn ngữ cần dịch</option>{languages.map(l => <option key={l.code} value={l.code}>{customerMode && l.code === 'zh' ? 'Tiếng Trung (giản thể)' : translationLanguageLabel(l)}</option>)}
        </select></div>
      </Card>
      {busy === 'load' && <Spinner label="Đang tải bản dịch" />}
      {!busy && !error && transcript && target && !draft && !saved && !displayGroups.length && <Card className="translation-empty" role="status"><h2>Chưa có bản nháp để xem</h2><p>{attempt ? 'Bản nháp sẽ hiển thị tại đây khi máy chủ xác nhận kết quả hợp lệ. Kiểm tra trạng thái ở phía trên; không gửi lại yêu cầu.' : 'Chưa có nội dung dịch cho ngôn ngữ đã chọn.'}</p></Card>}
      {!busy && catalogReady && !languages.length && <Card><h2>Chưa có ngôn ngữ đích</h2><p>Vui lòng liên hệ quản trị viên để cấu hình danh sách ngôn ngữ.</p></Card>}
      {!busy && catalogReady && !transcript && <Card><h2>Cần có bản ghi trước khi dịch</h2><p>Hãy quay lại Bản ghi để kiểm tra dữ liệu nguồn.</p></Card>}
      {!busy && catalogReady && transcript && languages.length > 0 && !target && <p className="translation-note" role="status">Chọn ngôn ngữ đích để xem bản dịch hoặc kế hoạch cụm nguồn.</p>}
      {plan && !draft && !saved && <Card><h2>Kiểm tra ranh giới cụm nguồn</h2><p>{customerMode ? 'Máy chủ tạo kế hoạch cụm từ bản ghi hiện tại và sẽ kiểm tra lại nguồn trước khi dịch. Không cần cấp permit riêng cho dự án.' : 'Các cụm dưới đây chỉ là đề xuất. Gộp các cụm liên tiếp nếu ranh giới cắt câu, tên riêng hoặc địa chỉ; không ép mỗi từ Việt tương ứng một từ Anh.'}</p>
        <Button variant="secondary" disabled={Boolean(busy)} onClick={() => { setGroups(plan.groups); setPlanReviewed(false); requestKey.current = null; }}>Khôi phục kế hoạch nguồn</Button>
      </Card>}
      {displayGroups.map((g, i) => <Card key={g.groupId} className="group-translation-card" aria-labelledby={`translation-group-${i}`}><div className="group-translation-card__heading"><h2 id={`translation-group-${i}`}>Cụm {i + 1}</h2><span className="group-translation-card__time" aria-label="Khoảng thời gian nguồn">{formatPreciseTimestamp(g.startTime)} → {formatPreciseTimestamp(g.endTime)}</span></div>
        <div className="group-translation-columns"><section><h3>Bản gốc</h3><p lang={project.sourceLanguage ?? undefined}>{g.sourceText}</p></section><section><h3>{saved ? 'Bản dịch đã lưu' : draft ? 'Bản dịch nháp' : 'Bản dịch'}</h3><p lang={g.translatedText ? target : undefined}>{g.translatedText || 'Chưa tạo bản dịch nháp cho cụm này.'}</p></section></div>
        {plan && !draft && !saved && !customerMode && i < groups.length - 1 && <Button variant="secondary" disabled={!canMutate || Boolean(busy)} onClick={() => merge(i)}>Gộp với cụm tiếp theo</Button>}
      </Card>)}
      {legacy && <><p>Bản dịch đã lưu theo định dạng phân đoạn cũ, giữ nguyên dữ liệu.</p>{legacy.rows.map(row => <Card key={row.source.id}><div className="group-translation-columns"><section><h3>Bản gốc</h3><p>{row.source.text}</p></section><section><h3>Bản dịch</h3><p>{row.translation?.translatedText ?? 'Chưa có bản dịch khớp nguồn.'}</p></section></div></Card>)}</>}
      {plan && !draft && !saved && <Card className="group-translation-review"><label><input type="checkbox" checked={planReviewed} disabled={!canMutate || Boolean(busy)} onChange={e => setPlanReviewed(e.target.checked)} /> Tôi đã kiểm tra và chấp nhận ranh giới các cụm nguồn.</label>
        <p id="translation-generation-hint" className="translation-note">{generationHint}</p>
        <Button aria-describedby="translation-generation-hint" disabled={blockGeneration || !canMutate || !planReviewed || Boolean(busy) || (customerMode && (submitted || Boolean(attempt)))} loading={busy === 'preview'} onClick={preview}>{customerMode ? `Dịch ${customerTargetLabel(target)}` : 'Xem trước bản dịch'}</Button>
      </Card>}
      {draft && <Card className="group-translation-review"><h2>Duyệt bản dịch nháp</h2><p>Hết hạn: {new Date(draft.expiresAt).toLocaleString('vi-VN')}. {customerMode ? 'Bản nháp được giữ theo yêu cầu dịch, chưa được duyệt và chưa dùng được cho Giọng đọc. Không tự động dịch lại.' : 'Nháp chỉ nằm trong bộ nhớ máy chủ; khởi động lại sẽ làm mất nháp. Không tự động dịch lại.'}</p>
        <p>So sánh ý nghĩa từng cụm và toàn câu, tên riêng, số và địa chỉ. Kiểm tra nội dung bị thêm/bỏ và cách diễn đạt {customerTargetLabel(target)}. Kiểm tra cấu trúc không chứng minh bản dịch đúng tuyệt đối.</p>
        <label><input type="checkbox" checked={reviewed} disabled={!canMutate || Boolean(busy)} onChange={e => setReviewed(e.target.checked)} /> Tôi đã kiểm tra ngữ nghĩa và chấp nhận bản dịch này.</label>
        <p id="translation-approval-hint" className="translation-note">{!canMutate ? 'Dự án đang ở chế độ chỉ đọc.' : busy ? 'Vui lòng chờ thao tác hiện tại hoàn tất.' : 'Chỉ duyệt sau khi đánh dấu xác nhận đã kiểm tra bản dịch.'}</p>
        <div className="group-translation-actions"><Button aria-describedby="translation-approval-hint" disabled={!canMutate || !reviewed || Boolean(busy)} loading={busy === 'approve'} onClick={approve}>Duyệt và lưu bản dịch</Button>
          <Button variant="secondary" aria-describedby="translation-close-draft-note" disabled={Boolean(busy)} onClick={() => { setDraft(null); setReviewed(false); const next = new URLSearchParams(params); next.delete('draft'); setParams(next, { replace: true }); }}>Đóng bản xem nháp</Button></div>
        <p id="translation-close-draft-note" className="translation-note">Đóng bản xem không xóa hoặc từ chối bản nháp trên máy chủ. Bản nháp có thể xuất hiện lại khi tải dữ liệu.</p>
      </Card>}
      {saved && !error && <Link className="button button--primary button--md" to={`/projects/${project.id}/voice?language=${encodeURIComponent(target)}`}>Tiếp tục: Giọng đọc</Link>}
    </div>
  </>;
}
