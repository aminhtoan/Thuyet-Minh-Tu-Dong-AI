export const controlledPreviewTarget = Object.freeze({
  model: 'gemini-3.8-flash', thinking: 'MEDIUM',
});
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const hash = /^[a-f\d]{64}$/i;
const objectId = /^[a-f\d]{24}$/i;
const submittedAuthorizations = new Set(); // Survives component remount; server fence handles reload/restart.
export function parseExecutionReadiness(value, projectId) {
  if (!record(value) || !['LOCKED', 'READY', 'EXPIRED', 'CONSUMED', 'MISMATCHED'].includes(value.state)) return { state: 'BLOCKED', executionAllowed: false };
  if (value.state !== 'READY') return value.executionAllowed === false ? { state: value.state, executionAllowed: false } : { state: 'BLOCKED', executionAllowed: false };
  const status = parseControlledStatus({ ...value, generationEnabled: false }, projectId);
  const l = value.limits;
  if (!status.serverReported || status.state !== 'READY' || value.executionAllowed !== true || !hash.test(value.authorizationId) || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= Date.now() || !record(l) || l.metadataRequests !== 1 || l.generationRequests !== 1 || l.retries !== 0 || l.timeoutMs !== 120000 || l.maxOutputTokens !== 8192) return { state: 'BLOCKED', executionAllowed: false };
  return { state: 'READY', executionAllowed: true, authorizationId: value.authorizationId, expiresAt: value.expiresAt, scope: status.scope,
    source: { segmentCount: value.source.segmentCount, groupCount: value.source.groupCount, coverage: value.source.coverage } };
}
const blocked = (message) => ({ state: 'BLOCKED', generationEnabled: false, serverReported: false, message });
const unavailable = 'Không thể xác minh controlled runtime. Kiểm tra cấu hình hoặc đăng nhập lại; không thực hiện dịch.';
const record = value => value && typeof value === 'object' && !Array.isArray(value);

export function parseControlledStatus(value, projectId) {
  if (!record(value) || !['READY', 'BLOCKED', 'REQUEST_CONSUMED'].includes(value.state) || value.generationEnabled !== false) return blocked('Phản hồi trạng thái không được hỗ trợ.');
  if (value.state === 'READY' || value.state === 'REQUEST_CONSUMED') {
    const s = value.scope, source = value.source, t = controlledPreviewTarget;
    if (!objectId.test(projectId) || !record(s) || s.projectId !== projectId || !Number.isSafeInteger(s.transcriptRevision) || s.transcriptRevision < 1 || !hash.test(s.sourceDigest) || s.sourceLanguage !== 'vi' || s.targetLanguage !== 'en' || s.model !== t.model || s.thinking !== t.thinking) return blocked('Thông tin nguồn hoặc cấu hình không khớp phạm vi được duyệt.');
    if (value.state === 'READY' && (!record(source) || !Number.isSafeInteger(source.segmentCount) || source.segmentCount <= 0 || source.segmentCount > 10000 || source.coverage !== source.segmentCount || !Number.isSafeInteger(source.groupCount) || source.groupCount < 1 || source.groupCount > 1000)) return blocked('Coverage không hợp lệ.');
  }
  return { state: value.state, generationEnabled: false, serverReported: true, scope: value.state === 'BLOCKED' ? undefined : { projectId: value.scope.projectId, revision: value.scope.transcriptRevision, digest: value.scope.sourceDigest },
    message: value.state === 'READY' ? 'Kiểm tra cục bộ đã đạt. Generation vẫn bị khóa; chưa xác nhận Gemini access/quota.' : value.state === 'REQUEST_CONSUMED' ? 'Yêu cầu đã được sử dụng hoặc có kết quả chưa xác định. Không thử dịch lại.' : 'Máy chủ chưa xác nhận đủ điều kiện. Generation bị khóa.' };
}

export function parseControlledDraft(value, id, t, now = Date.now()) {
  if (!t || !objectId.test(t.projectId) || !hash.test(t.digest) || !Number.isSafeInteger(t.revision) || t.revision < 1) throw new Error('Thiếu binding đã xác minh.');
  if (!record(value) || value.draftId !== id || !uuid.test(id) || value.projectId !== t.projectId || value.transcriptRevision !== t.revision || value.sourceRevision !== t.digest || value.sourceLanguage !== 'vi' || value.targetLanguage !== 'en' || value.groupingVersion !== 'phrase-candidates-v1' || value.alignmentFormat !== 'GROUPS_V1' || value.state !== 'DRAFT' || !hash.test(value.outputDigest) || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= now || !Array.isArray(value.groups) || !value.groups.length || value.groups.length > 1000) throw new Error('Bản nháp không hợp lệ, không khớp nguồn hoặc đã hết hạn.');
  const ids = new Set(), groupIds = new Set(); let end = 0;
  const groups = value.groups.map((g, i) => {
    if (!record(g) || !hash.test(g.groupId) || groupIds.has(g.groupId) || g.sequence !== i + 1 || !Number.isFinite(g.startTime) || !Number.isFinite(g.endTime) || g.startTime < end || g.endTime <= g.startTime || !Array.isArray(g.sourceSegmentIds) || !g.sourceSegmentIds.length || g.sourceSegmentIds.length > 10000 || ['sourceText', 'translatedText'].some(k => typeof g[k] !== 'string' || !g[k].trim() || g[k].length > 32000)) throw new Error('Các cụm bản nháp không hợp lệ.');
    for (const id of g.sourceSegmentIds) { if (!objectId.test(id) || ids.has(id) || ids.size >= 10000) throw new Error('Coverage bản nháp không hợp lệ.'); ids.add(id); }
    groupIds.add(g.groupId); end = g.endTime;
    return { groupId: g.groupId, sequence: g.sequence, sourceSegmentIds: [...g.sourceSegmentIds], sourceText: g.sourceText, translatedText: g.translatedText, startTime: g.startTime, endTime: g.endTime };
  });
  return { draftId: id, projectId: t.projectId, transcriptRevision: t.revision, sourceRevision: t.digest, sourceLanguage: 'vi', targetLanguage: 'en', groupingVersion: 'phrase-candidates-v1', alignmentFormat: 'GROUPS_V1', state: 'DRAFT', outputDigest: value.outputDigest, expiresAt: value.expiresAt, groups };
}

// Intentionally independent of api(): no ordinary-origin fallback, refresh POST,
// automatic retry, mutation methods, credentials files or permit provisioning.
export function createControlledPreviewClient({ enabled, executionEnabled = false, origin, projectId, getToken, fetcher = fetch }) {
  function base() {
    if (!enabled || !objectId.test(projectId) || origin !== 'http://127.0.0.1:18083') throw new Error(unavailable);
    return `${origin}/api/projects/${projectId}/translations`;
  }
  async function get(suffix, signal) {
    const url = base(), token = getToken();
    if (typeof token !== 'string' || !token.trim()) throw new Error('Phiên đăng nhập không khả dụng. Vui lòng đăng nhập lại.');
    const response = await fetcher(url + suffix, { method: 'GET', headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại trước khi kiểm tra.' : response.status === 403 || response.status === 404 ? 'Không có quyền truy cập hoặc dữ liệu không khả dụng.' : response.status === 410 ? 'Bản nháp đã hết hạn hoặc không còn trong bộ nhớ máy chủ.' : unavailable);
    const body = await response.json();
    if (body?.success !== true) throw new Error(unavailable);
    return body.data;
  }
  return Object.freeze({
    async readiness(signal) {
      try { return parseExecutionReadiness(await get('/execution-readiness', signal), projectId); }
      catch { return { state: 'BLOCKED', executionAllowed: false }; }
    },
    async execute(readiness, confirmed, signal) {
      const url = base();
      if (!executionEnabled || confirmed !== true || readiness?.state !== 'READY' || readiness.executionAllowed !== true || readiness.scope?.projectId !== projectId || !hash.test(readiness.authorizationId) || readiness.expiresAt <= Date.now() || submittedAuthorizations.has(readiness.authorizationId)) throw new Error('Thực thi bị khóa hoặc đã được yêu cầu. Không tự thử lại.');
      const token = getToken();
      if (typeof token !== 'string' || !token.trim()) throw new Error('Phiên đăng nhập không khả dụng.');
      submittedAuthorizations.add(readiness.authorizationId); // Before fetch; never removed after uncertainty.
      try {
        const response = await fetcher(url + '/controlled-preview', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: 'EXECUTE_ONCE', authorizationId: readiness.authorizationId }), credentials: 'omit', cache: 'no-store', redirect: 'error',
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(150000)]) : AbortSignal.timeout(150000) });
        if (!response.ok) throw new Error();
        const body = await response.json();
        if (body?.success !== true) throw new Error();
        const raw = body.data?.draft;
        const draft = parseControlledDraft(raw, raw?.draftId, readiness.scope);
        if (draft.groups.length !== readiness.source.groupCount || draft.groups.reduce((n, g) => n + g.sourceSegmentIds.length, 0) !== readiness.source.segmentCount) throw new Error();
        return draft;
      } catch { throw new Error('UNCERTAIN: Chưa xác định kết quả yêu cầu. Không gửi lại hoặc tạo permit thay thế; cần kiểm tra trạng thái và bản nháp chỉ đọc.'); }
    },
    async status(signal) {
      try { return parseControlledStatus(await get('/controlled-status', signal), projectId); }
      catch { return blocked(unavailable); } // Never surface raw server/network errors.
    },
    async draft(draftId, status, signal) {
      if (!status?.serverReported || !['READY', 'REQUEST_CONSUMED'].includes(status.state) || status.generationEnabled !== false || !uuid.test(draftId)) throw new Error('Cần trạng thái được xác minh và mã bản nháp hợp lệ trước khi xem.');
      try { return parseControlledDraft((await get(`/drafts/${encodeURIComponent(draftId)}`, signal))?.draft, draftId, status.scope); }
      catch { throw new Error('Không thể xem bản nháp: không khả dụng, hết hạn, không có quyền hoặc dữ liệu không hợp lệ. Không tự động dịch lại.'); }
    },
  });
}
