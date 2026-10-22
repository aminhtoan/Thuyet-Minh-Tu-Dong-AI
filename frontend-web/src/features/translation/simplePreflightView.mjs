const unknown = 'NOT VERIFIED';
const state = (value, values) => values.includes(value) ? value : unknown;
const number = value => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('vi-VN') : unknown;
export function simplePreflightView(value, errorCode) {
  const empty = message => ({ status: 'BLOCKED', message, rows: [], canGenerate: false });
  if (errorCode) return empty(['AUTH_REQUIRED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'FORBIDDEN', 'PROJECT_NOT_FOUND'].includes(errorCode) ? 'Phiên đăng nhập hoặc quyền sở hữu chưa được xác minh. Không tự làm mới phiên.' : 'Không thể kiểm tra SIMPLE. Kiểm tra kết nối Backend development; không gửi yêu cầu dịch.');
  if (!value || value.contract !== 'CUSTOMER_SIMPLE_PREFLIGHT_V1' || value.generationAuthorized !== false || !['BLOCKED', 'UNKNOWN', 'READY'].includes(value.status)) return empty('Kết quả preflight không đáng tin cậy. Không bắt đầu dịch.');
  const limits = value.limits ?? {};
  const digest = /^[a-f0-9]{64}$/.test(value.sourceDigest ?? '') ? `${value.sourceDigest.slice(0, 12)}…${value.sourceDigest.slice(-8)}` : unknown;
  const conflict = state(value.attempt, ['CLEAR', 'BLOCKED']);
  const attemptStatus = state(value.attemptStatus, ['NOT_SENT', 'PROCESSING', 'DRAFT_SAVED', 'EXPIRED', 'FAILED_PRE_DISPATCH', 'FAILED_RESPONSE', 'UNCERTAIN']);
  const q = value.quotaEvidence;
  const quotaVerified = value.quota === 'VERIFIED' && q?.status === 'VERIFIED' && ['userRemaining', 'globalRemaining', 'userLimit', 'globalLimit'].every(key => Number.isSafeInteger(q[key]) && q[key] >= 0) && q.userRemaining <= q.userLimit && q.globalRemaining <= q.globalLimit;
  const deployment = value.runtime?.deploymentEvidence;
  const targetMatch = deployment?.status === 'VERIFIED' && deployment.intendedTargetApproval === 'APPROVED_BY_USER' && deployment.approvedDatabaseMatch === true;
  const countsValid = Number.isSafeInteger(value.groups) && value.groups > 0 && value.groups <= 32 && Number.isSafeInteger(value.segments) && value.segments > 0 && value.segments <= 10000 && Number.isSafeInteger(value.inputBytes) && value.inputBytes <= 12000 && value.inputBytes > 0 && Number.isSafeInteger(value.maxGroupBytes) && value.maxGroupBytes > 0 && value.maxGroupBytes <= 2000 && Number.isSafeInteger(value.sourceBytes) && value.sourceBytes > 0 && value.sourceBytes <= 98304;
  const ready = value.status === 'READY' && value.readyForManualExecution === true && value.readinessScope === 'NORMAL_CUSTOMER_DURABLE_PATH' && value.transcript === 'PASS' && value.simpleLimits === 'PASS' && countsValid && value.orderedCoverage === `${value.segments}/${value.segments}` && digest !== unknown && conflict === 'CLEAR' && value.persistedEnglish === 'CLEAR' && value.activeJobs === 'CLEAR' && value.drafts?.count === 0 && value.crossProcess?.status === 'CLEAR' && quotaVerified && q.available === true && q.userRemaining > 0 && q.globalRemaining > 0 && targetMatch && value.runtime?.method === 'GEMINI_SIMPLE_V1' && value.runtime?.customerEnabled === true && value.runtime?.thinkingDefault === true;
  const status = value.status === 'READY' ? ready ? 'READY' : 'BLOCKED' : value.status;
  return { status, canGenerate: false,
    message: ready ? 'Điều kiện Customer durable-path đã đạt tại thời điểm kiểm tra. RAM draft ở process khác vẫn UNKNOWN; không tự động dịch, phải kiểm tra lại khi gửi.' : value.simpleLimits === 'FAIL' ? 'Nguồn vượt giới hạn GEMINI_SIMPLE_V1. Không cắt nội dung hoặc bắt đầu dịch.' : conflict === 'BLOCKED' ? 'Dự án có attempt cũ hoặc draft. Không gửi lại hay chuyển phương thức.' : 'Chưa đủ điều kiện dịch: kiểm tra quota, target database, runtime và conflicts bên dưới. Không tự gửi yêu cầu AI.',
    rows: [
      ['Transcript CURRENT', state(value.transcript, ['PASS', 'FAIL'])], ['Revision', number(value.revision)], ['Source digest', digest],
      ['Số nhóm', `${number(value.groups)} / ${number(limits.groups)}`], ['Số segment', `${number(value.segments)} / ${number(limits.segments)}`],
      ['Source bytes', `${number(value.sourceBytes)} / ${number(limits.sourceBytes)}`], ['Input JSON UTF-8 bytes', `${number(value.inputBytes)} / ${number(limits.inputBytes)}`],
      ['Nhóm lớn nhất (UTF-8 bytes)', `${number(value.maxGroupBytes)} / ${number(limits.groupBytes)}`],
      ['Giới hạn SIMPLE', state(value.simpleLimits, ['PASS', 'FAIL'])],
      ['Ordered coverage', /^\d{1,5}\/\d{1,5}$/.test(value.orderedCoverage ?? '') ? value.orderedCoverage : unknown],
      ['Attempt', conflict === 'BLOCKED' ? `${conflict} · ${attemptStatus}` : conflict],
      ['Bản dịch tiếng Anh đã lưu', state(value.persistedEnglish, ['CLEAR', 'BLOCKED'])], ['Job đang chạy', state(value.activeJobs, ['CLEAR', 'BLOCKED'])],
      ['Draft trong process', number(value.drafts?.count)], ['Draft ở process khác', 'UNKNOWN'],
      ['Quota còn lại', quotaVerified ? `Customer ${number(q.userRemaining)}/${number(q.userLimit)} · Global ${number(q.globalRemaining)}/${number(q.globalLimit)}` : unknown], ['Backend runtime method', state(value.runtime?.method, ['GROUPS_V1', 'GEMINI_SIMPLE_V1'])],
      ['Customer translation', typeof value.runtime?.customerEnabled === 'boolean' ? value.runtime.customerEnabled ? 'ON' : 'OFF' : unknown],
      ['Thinking DEFAULT', typeof value.runtime?.thinkingDefault === 'boolean' ? value.runtime.thinkingDefault ? 'YES' : 'NO' : unknown],
      ['Deployment identity', targetMatch ? 'VERIFIED · target development khớp' : deployment?.intendedTargetApproval === 'MISMATCH' ? 'MISMATCH' : unknown],
    ],
  };
}
