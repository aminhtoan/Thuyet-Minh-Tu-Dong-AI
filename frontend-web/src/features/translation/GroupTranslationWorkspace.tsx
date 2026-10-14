import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { WorkflowSteps } from '../../components/common/WorkflowSteps';
import { PageHeader } from '../../components/layout/PageHeader';
import { Spinner } from '../../components/common/Spinner';
import { voiceService } from '../voice/voiceService';
import { projectRepository } from '../projects/projectRepository';
import type { Project } from '../projects/types';
import { transcriptService } from '../transcript/transcriptService';
import type { Transcript } from '../transcript/types';
import { formatPreciseTimestamp } from '../transcript/transcriptPresentation.mjs';
import { translationTargetChoices, translationLanguageLabel } from './translationLanguages.mjs';
import { groupTranslationService, type LegacyTranslationDto } from './groupTranslationService';
import { buildTranslationPresentation, mapTranslationSegments } from './translationPresentation.mjs';
import type { GroupDraft, GroupPlan, GroupTranslation, TranslationGroup } from './groupTypes';

type Language = { code: string; name: string; nativeName: string };
const message = (error: unknown) => error instanceof Error ? error.message : 'Không thể tải bản dịch. Vui lòng thử lại.';
export function GroupTranslationWorkspace({ project, preferredTarget }: { project: Project; preferredTarget: string }) {
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
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    void (async () => {
      await Promise.resolve(); if (!active) return;
      setBusy('load'); setError(null); setPlan(null); setSaved(null); setDraft(null); setGroups([]); setReviewed(false); setPlanReviewed(false); requestKey.current = null;
      const [catalog, source] = await Promise.all([voiceService.getLanguages({ signal: controller.signal }), transcriptService.getTranscript(project.id, { signal: controller.signal })]);
      if (!active) return;
      const choices = translationTargetChoices(catalog, project.sourceLanguage);
      setLanguages(choices); setCatalogReady(true); setTranscript(source);
      if (!target || !choices.some(c => c.code === target) || !source) return;
      const stored = await groupTranslationService.saved(project.id, target, controller.signal);
      if (!active) return;
      if (stored) { setSaved(stored); return; }
      if (draftId) {
        const restored = await groupTranslationService.draft(project.id, draftId, controller.signal);
        if (!active) return;
        if (restored.targetLanguage !== target) throw new Error('Bản nháp không thuộc ngôn ngữ đang chọn.');
        setDraft(restored); return;
      }
      const next = await groupTranslationService.plan(project.id, target, controller.signal);
      if (active) { setPlan(next); setGroups(next.groups); }
    })().catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setBusy(null); });
    return () => { active = false; controller.abort(); };
  }, [project.id, project.sourceLanguage, target, draftId, reload]);

  function changeTarget(value: string) {
    if (lock.current) return;
    setTarget(value);
    const next = new URLSearchParams(params); next.set('language', value); next.delete('draft'); setParams(next, { replace: true });
  }
  function merge(index: number) {
    if (busy || draft || saved) return;
    setGroups(current => current.flatMap((g, i) => i === index ? [{ ...g, sourceSegmentIds: [...g.sourceSegmentIds, ...current[i + 1]!.sourceSegmentIds], sourceText: `${g.sourceText} ${current[i + 1]!.sourceText}`, endTime: current[i + 1]!.endTime }] : i === index + 1 ? [] : [g]).map((g, i) => ({ ...g, sequence: i + 1 })));
    setPlanReviewed(false); requestKey.current = null;
  }
  async function preview() {
    if (!plan || !planReviewed || lock.current || busy || draft || saved) return;
    if (!window.confirm('Tạo bản dịch nháp bằng AI cho các cụm đã kiểm tra? Thao tác có thể phát sinh chi phí. Bản dịch chỉ được lưu sau khi bạn duyệt.')) return;
    lock.current = true; setBusy('preview'); setError(null);
    requestKey.current ??= crypto.randomUUID();
    try {
      const value = await groupTranslationService.preview(project.id, plan, groups, requestKey.current);
      if (mounted.current) { setDraft(value); setReviewed(false); const next = new URLSearchParams(params); next.set('draft', value.draftId); next.set('language', value.targetLanguage); setParams(next, { replace: true }); }
    } catch (e) { if (mounted.current) setError(message(e)); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }
  async function approve() {
    if (!draft || !reviewed || busy || lock.current) return;
    if (Date.parse(draft.expiresAt) <= Date.now()) { setError('Bản nháp đã hết hạn. Không tự động dịch lại.'); return; }
    lock.current = true; setBusy('approve'); setError(null);
    try {
      const value = await groupTranslationService.approve(project.id, draft);
      if (mounted.current) { setSaved(value); setDraft(null); setReviewed(false); }
      // Persistence succeeded even if refreshing the project list fails.
      void projectRepository.refresh().catch(() => undefined);
    } catch (e) { if (mounted.current) setError(message(e)); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }
  const groupedSaved = saved?.alignmentFormat === 'GROUPS_V1' ? saved : null;
  const displayGroups = groupedSaved?.groups ?? draft?.groups ?? groups;
  const legacy = saved && saved.alignmentFormat !== 'GROUPS_V1' && transcript ? buildTranslationPresentation(transcript.segments, mapTranslationSegments(saved.id, saved.segments, transcript.segments)) : null;
  return <>
    <PageHeader title="Bản dịch" description="Kiểm tra cụm nguồn, xem trước bản dịch và duyệt ngữ nghĩa trước khi lưu."
      actions={<Link className="button button--secondary button--md" to={`/projects/${project.id}/transcript`}>Quay lại bản ghi</Link>} />
    <WorkflowSteps current="translation" />
    <div className="group-translation-workspace">
      <Card className="translation-language-card"><div><h2>{project.name}</h2><p>Ngôn ngữ nguồn: {translationLanguageLabel({ code: project.sourceLanguage, name: project.sourceLanguage, nativeName: '' })}</p></div>
        <div className="translation-language-field"><label htmlFor="group-target">Ngôn ngữ đích</label><select id="group-target" value={target} disabled={Boolean(busy)} onChange={e => changeTarget(e.target.value)}>
          <option value="">Chọn ngôn ngữ cần dịch</option>{languages.map(l => <option key={l.code} value={l.code}>{translationLanguageLabel(l)}</option>)}
        </select></div>
      </Card>
      <div role="status" aria-live="polite">{busy === 'preview' ? 'Đang tạo bản dịch nháp bằng AI...' : busy === 'approve' ? 'Đang lưu bản dịch đã duyệt...' : busy === 'load' ? 'Đang tải bản ghi và bản dịch...' : saved ? 'Bản dịch đã lưu.' : draft ? 'Bản nháp — chưa lưu vào cơ sở dữ liệu, chưa dùng được cho Giọng đọc.' : 'Chưa có bản dịch đã lưu.'}</div>
      {busy === 'load' && <Spinner label="Đang tải bản dịch" />}
      {error && <Card><p role="alert">{error}</p><Button variant="secondary" disabled={Boolean(busy)} onClick={() => setReload(n => n + 1)}>Tải lại dữ liệu (không gọi AI)</Button></Card>}
      {!busy && catalogReady && !languages.length && <Card><h2>Chưa có ngôn ngữ đích</h2><p>Vui lòng liên hệ quản trị viên để cấu hình danh sách ngôn ngữ.</p></Card>}
      {!busy && catalogReady && !transcript && <Card><h2>Cần có bản ghi trước khi dịch</h2><p>Hãy quay lại Bản ghi để kiểm tra dữ liệu nguồn.</p></Card>}
      {plan && !draft && !saved && <Card><h2>Kiểm tra ranh giới cụm nguồn</h2><p>Các cụm dưới đây chỉ là đề xuất. Gộp các cụm liên tiếp nếu ranh giới cắt câu, tên riêng hoặc địa chỉ; không ép mỗi từ Việt tương ứng một từ Anh.</p>
        <Button variant="secondary" disabled={Boolean(busy)} onClick={() => { setGroups(plan.groups); setPlanReviewed(false); requestKey.current = null; }}>Khôi phục kế hoạch nguồn</Button>
      </Card>}
      {displayGroups.map((g, i) => <Card key={g.groupId} className="group-translation-card"><h3>Cụm {i + 1} · {formatPreciseTimestamp(g.startTime)} → {formatPreciseTimestamp(g.endTime)}</h3>
        <div className="group-translation-columns"><section><h4>Bản gốc</h4><p>{g.sourceText}</p></section><section><h4>Bản dịch</h4><p>{g.translatedText || 'Chờ tạo bản dịch nháp.'}</p></section></div>
        {plan && !draft && !saved && i < groups.length - 1 && <Button variant="secondary" disabled={Boolean(busy)} onClick={() => merge(i)}>Gộp với cụm tiếp theo</Button>}
      </Card>)}
      {legacy && <><p>Bản dịch đã lưu theo định dạng phân đoạn cũ, giữ nguyên dữ liệu.</p>{legacy.rows.map(row => <Card key={row.source.id}><div className="group-translation-columns"><section><h3>Bản gốc</h3><p>{row.source.text}</p></section><section><h3>Bản dịch</h3><p>{row.translation?.translatedText ?? 'Chưa có bản dịch khớp nguồn.'}</p></section></div></Card>)}</>}
      {plan && !draft && !saved && <Card className="group-translation-review"><label><input type="checkbox" checked={planReviewed} disabled={Boolean(busy)} onChange={e => setPlanReviewed(e.target.checked)} /> Tôi đã kiểm tra và chấp nhận ranh giới các cụm nguồn.</label>
        <Button disabled={!planReviewed || Boolean(busy)} loading={busy === 'preview'} onClick={preview}>Xem trước bản dịch</Button>
      </Card>}
      {draft && <Card className="group-translation-review"><h2>Duyệt bản dịch nháp</h2><p>Hết hạn: {new Date(draft.expiresAt).toLocaleString('vi-VN')}. Nháp chỉ nằm trong bộ nhớ máy chủ; khởi động lại sẽ làm mất nháp. Không tự động dịch lại.</p>
        <p>So sánh ý nghĩa từng cụm và toàn câu, tên riêng, số và địa chỉ. Kiểm tra nội dung bị thêm/bỏ và cách diễn đạt tiếng Anh. Kiểm tra cấu trúc không chứng minh bản dịch đúng tuyệt đối.</p>
        <label><input type="checkbox" checked={reviewed} disabled={Boolean(busy)} onChange={e => setReviewed(e.target.checked)} /> Tôi đã kiểm tra ngữ nghĩa và chấp nhận bản dịch này.</label>
        <div className="group-translation-actions"><Button disabled={!reviewed || Boolean(busy)} loading={busy === 'approve'} onClick={approve}>Duyệt và lưu bản dịch</Button>
          <Button variant="secondary" disabled={Boolean(busy)} onClick={() => { setDraft(null); setReviewed(false); const next = new URLSearchParams(params); next.delete('draft'); setParams(next, { replace: true }); }}>Từ chối bản nháp</Button></div>
      </Card>}
      {saved && !error && <Link className="button button--primary button--md" to={`/projects/${project.id}/voice?language=${encodeURIComponent(target)}`}>Tiếp tục: Giọng đọc</Link>}
    </div>
  </>;
}
