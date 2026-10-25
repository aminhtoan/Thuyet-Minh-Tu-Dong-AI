// Server-derived state only. Reload is GET-only; never authorize resubmission.
export function customerAttemptMessage(attempt) {
  if (['UNCERTAIN', 'FAILED_RESPONSE'].includes(attempt?.status)) {
    if ([408, 504].includes(attempt.providerHttpStatus)) return `Đường gọi dịch trả HTTP ${attempt.providerHttpStatus} do hết thời gian chờ. Chưa xác minh được kết quả; không gửi lại để tránh xử lý trùng. Chỉ kiểm tra trạng thái hoặc liên hệ hỗ trợ.`;
    if (attempt.providerHttpStatus === 400) return 'Gemini từ chối yêu cầu (HTTP 400). Cần hỗ trợ kiểm tra tham số API, quyền truy cập và billing; chưa xác định nguyên nhân cụ thể. Không nhấn Dịch lại hoặc chuyển model. Chỉ tải lại dữ liệu.';
    if (attempt.providerHttpStatus === 503) return 'Gemini tạm thời không khả dụng (HTTP 503). Hãy kiểm tra trạng thái dịch vụ và liên hệ hỗ trợ kiểm tra lần gửi này. Không nhấn Dịch lại hoặc chuyển model. Chỉ tải lại dữ liệu.';
  }
  switch (attempt?.status) {
    case 'NOT_SENT': return 'Máy chủ đang chuẩn bị yêu cầu, chưa gửi Gemini. Chỉ tải lại dữ liệu.';
    case 'PROCESSING': return 'Yêu cầu dịch đang được xử lý. Không gửi thêm yêu cầu AI.';
    case 'DRAFT_SAVED': return 'Bản dịch nháp đã được lưu, đang chờ bạn kiểm tra và duyệt.';
    case 'FAILED_PRE_DISPATCH': return 'Yêu cầu thất bại trước khi gửi Gemini. Cần xử lý lỗi máy chủ; không tự gửi lại.';
    case 'FAILED_RESPONSE': return 'Gemini đã phản hồi nhưng bản nháp chưa được lưu hợp lệ. Không dịch lại; hãy liên hệ hỗ trợ để kiểm tra.';
    case 'EXPIRED': return 'Bản nháp đã hết hạn. Không tự động dịch lại.';
    case 'UNCERTAIN': return 'Chưa xác định Gemini đã nhận yêu cầu hay chưa. Không nhấn Dịch lại. Chỉ tải lại dữ liệu; nếu chưa có nháp, liên hệ hỗ trợ kiểm tra lần gửi đầu tiên.';
    default: return attempt ? 'Không xác minh được trạng thái yêu cầu. Không gửi thêm yêu cầu AI.' : null;
  }
}
