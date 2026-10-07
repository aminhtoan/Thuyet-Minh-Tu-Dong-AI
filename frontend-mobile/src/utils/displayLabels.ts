const statusLabels: Record<string, string> = {
  WAITING: 'Đang chờ', STARTING: 'Đang chuẩn bị', PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành', FAILED: 'Thất bại', CANCELLED: 'Đã hủy',
  LOADING: 'Đang tải', NOT_STARTED: 'Chưa bắt đầu', GENERATING: 'Đang tạo bản ghi',
  READY: 'Sẵn sàng', SAVING: 'Đang lưu', SAVED: 'Đã lưu', TRANSLATING: 'Đang dịch',
  DRAFT: 'Bản nháp', UPLOADED: 'Đã tải lên', TRANSCRIBING: 'Đang tạo bản ghi',
  TRANSCRIBED: 'Đã tạo bản ghi', TRANSLATED: 'Đã dịch',
  GENERATING_AUDIO: 'Đang tạo giọng đọc', PROCESSING_VIDEO: 'Đang xử lý video',
};

export function getDisplayStatus(status: string): string {
  return statusLabels[status] ?? status;
}
