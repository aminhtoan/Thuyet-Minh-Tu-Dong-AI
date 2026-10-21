export const controlledPreviewTarget = Object.freeze({
  projectId: '6ad5c93a86cf95b7523704a5', revision: 1,
  digest: '81638f2cb62e5f5f010853b047855cb72ace5ddbb2ca083890b51cdd2fe44906',
  model: 'gemini-3.8-flash', thinking: 'MEDIUM',
});
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const hash = /^[a-f\d]{64}$/i;
const objectId = /^[a-f\d]{24}$/i;
const blocked = (message) => ({ state: 'BLOCKED', generationEnabled: false, serverReported: false, message });
const unavailable = 'Không thể xác minh controlled runtime. Kiểm tra cấu hình hoặc đăng nhập lại; không thực hiện dịch.';
const record = value => value && typeof value === 'object' && !Array.isArray(value);

export function parseControlledStatus(value) {
  if (!record(value) || !['READY', 'BLOCKED', 'REQUEST_CONSUMED'].includes(value.state) || value.generationEnabled !== false) return blocked('Phản hồi trạng thái không được hỗ trợ.');
  if (value.state === 'READY') {
    const s = value.scope, source = value.source, t = controlledPreviewTarget;
    if (!record(s) || s.projectId !== t.projectId || s.transcriptRevision !== t.revision || s.sourceDigest !== t.digest || s.sourceLanguage !== 'vi' || s.targetLanguage !== 'en' || s.model !== t.model || s.thinking !== t.thinking || !record(source) || !Number.isSafeInteger(source.segmentCount) || source.segmentCount <= 0 || source.segmentCount > 10000 || source.coverage !== source.segmentCount || !Number.isSafeInteger(source.groupCount) || source.groupCount < 1 || source.groupCount > 1000) return blocked('Thông tin nguồn hoặc cấu hình không khớp phạm vi được duyệt.');
  }
  return { state: value.state, generationEnabled: false, serverReported: true,
    message: value.state === 'READY' ? 'Kiểm tra cục bộ đã đạt. Generation vẫn bị khóa; chưa xác nhận Gemini access/quota.' : value.state === 'REQUEST_CONSUMED' ? 'Yêu cầu đã được sử dụng hoặc có kết quả chưa xác định. Không thử dịch lại.' : 'Máy chủ chưa xác nhận đủ điều kiện. Generation bị khóa.' };
}

export function parseControlledDraft(value, id, now = Date.now()) {
  const t = controlledPreviewTarget;
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
export function createControlledPreviewClient({ enabled, origin, projectId, getToken, fetcher = fetch }) {
  function base() {
    if (!enabled || projectId !== controlledPreviewTarget.projectId || origin !== 'http://127.0.0.1:18083') throw new Error(unavailable);
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
    async status(signal) {
      try { return parseControlledStatus(await get('/controlled-status', signal)); }
      catch { return blocked(unavailable); } // Never surface raw server/network errors.
    },
    async draft(draftId, status, signal) {
      if (!status?.serverReported || !['READY', 'REQUEST_CONSUMED'].includes(status.state) || status.generationEnabled !== false || !uuid.test(draftId)) throw new Error('Cần trạng thái được xác minh và mã bản nháp hợp lệ trước khi xem.');
      try { return parseControlledDraft((await get(`/drafts/${encodeURIComponent(draftId)}`, signal))?.draft, draftId); }
      catch { throw new Error('Không thể xem bản nháp: không khả dụng, hết hạn, không có quyền hoặc dữ liệu không hợp lệ. Không tự động dịch lại.'); }
    },
  });
}
