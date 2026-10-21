export const sourceLimitMessage = 'Dữ liệu lời thoại vượt giới hạn xử lý. Vui lòng sử dụng video ngắn hơn hoặc giảm lượng lời thoại rồi thử lại.';
export function sourcePreflightView(value, errorCode) {
  const errors = {
    AUTH_REQUIRED: 'Phiên đăng nhập không khả dụng. Vui lòng đăng nhập lại.',
    INVALID_TOKEN: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
    TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Không tự động làm mới phiên.',
    FORBIDDEN: 'Bạn không có quyền kiểm tra dự án này.',
    PROJECT_NOT_FOUND: 'Dự án không khả dụng hoặc không thuộc quyền truy cập của bạn.',
    GROUP_TRANSLATION_DISABLED: 'Dịch theo cụm chưa được bật trên máy chủ.',
    CONTROLLED_EXECUTION_NOT_APPROVED: 'Controlled execution chưa được phê duyệt. Không thực hiện dịch.',
    DIAGNOSTIC_NOT_AVAILABLE: 'Chẩn đoán chỉ khả dụng trên Backend development.',
  };
  const blocked = message => ({ message, blocked: true, canGenerate: false });
  if (errorCode) return blocked(errors[errorCode] ?? 'Không thể kiểm tra nguồn do lỗi máy chủ hoặc kết nối. Vui lòng thử kiểm tra lại.');
  if (!value || !['PASS', 'BLOCKED', 'UNKNOWN'].includes(value.status) || value.sourceCapBytes !== 98304 || value.sourceSegmentLimit !== 10000 || value.generationAuthorized !== false) return blocked('Chưa có kết quả kiểm tra nguồn đáng tin cậy.');
  const bytes = Number.isSafeInteger(value.sourceBytes) && value.sourceBytes >= 0 ? value.sourceBytes : null;
  const segments = Number.isSafeInteger(value.segmentCount) && value.segmentCount >= 0 ? value.segmentCount : null;
  const atLeast = Number.isSafeInteger(value.segmentCountAtLeast) && value.segmentCountAtLeast > 10000 ? value.segmentCountAtLeast : null;
  const details = { bytes, segments, atLeast, cap: 98304, segmentLimit: 10000 };
  if (value.reasonCode === 'BLOCKED_SOURCE_CAP' || value.reasonCode === 'TRANSLATION_DRAFT_TOO_LARGE' || bytes > 98304 || segments > 10000 || atLeast) return { ...blocked(sourceLimitMessage), ...details };
  if (['SOURCE_MISSING', 'SOURCE_NOT_CURRENT', 'TRANSCRIPT_NOT_FOUND', 'TRANSCRIPT_REVISION_UNAVAILABLE'].includes(value.reasonCode)) return { ...blocked('Bản ghi chưa sẵn sàng hoặc chưa có revision đáng tin cậy. Vui lòng kiểm tra bước Bản ghi.'), ...details };
  if (value.transcript !== 'PASS' || value.groups !== 'PASS') return { ...blocked('Chưa xác minh được revision, digest hoặc coverage của nguồn. Vui lòng kiểm tra lại bản ghi.'), ...details };
  if (value.persistedEnglish !== 'PASS' || value.activeEnglishJobs !== 'PASS' || value.drafts?.count !== 0) return { ...blocked('Có dữ liệu hoặc tác vụ tiếng Anh xung đột, hoặc chưa xác minh được xung đột. Không bắt đầu dịch.'), ...details };
  return { ...details, blocked: false, canGenerate: false,
    message: value.groupTranslationEnabled === false ? 'Nguồn nằm trong giới hạn và đã xác minh revision/digest/coverage. Dịch theo cụm chưa được bật trên máy chủ.' : 'Nguồn đã qua kiểm tra cục bộ. Đây không phải quyền thực hiện dịch.',
    notice: 'Chỉ kiểm tra bản nháp trong process hiện tại; process khác chưa được xác minh. Không tự động bắt đầu dịch.' };
}
