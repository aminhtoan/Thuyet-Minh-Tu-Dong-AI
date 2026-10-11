export const projectStatusLabels = Object.freeze({
  DRAFT: 'Bản nháp',
  UPLOADED: 'Đã tải lên',
  TRANSCRIBING: 'Đang tạo bản ghi',
  TRANSCRIBED: 'Đã tạo bản ghi',
  TRANSLATING: 'Đang dịch',
  TRANSLATED: 'Đã dịch',
  GENERATING_AUDIO: 'Đang tạo giọng đọc',
  PROCESSING_VIDEO: 'Đang xử lý video',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Thất bại',
})

export const transcriptStatusLabels = Object.freeze({
  LOADING: 'Đang tải', NOT_STARTED: 'Chưa bắt đầu', GENERATING: 'Đang tạo bản ghi',
  READY: 'Sẵn sàng', SAVING: 'Đang lưu', SAVED: 'Đã lưu', FAILED: 'Thất bại',
})

export const translationStatusLabels = Object.freeze({
  LOADING: 'Đang tải', NOT_STARTED: 'Chưa bắt đầu', TRANSLATING: 'Đang dịch',
  READY: 'Sẵn sàng', SAVING: 'Đang lưu', SAVED: 'Đã lưu', FAILED: 'Thất bại',
})

export const voiceStatusLabels = Object.freeze({
  LOADING: 'Đang tải', READY: 'Sẵn sàng', SAVING: 'Đang lưu', SAVED: 'Đã lưu', FAILED: 'Thất bại',
})

export const processingStatusLabels = Object.freeze({
  WAITING: 'Chờ xử lý', STARTING: 'Đang khởi tạo', PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành', FAILED: 'Thất bại', CANCELLED: 'Đã hủy',
})

export const workflowStepLabels = Object.freeze([
  'Tải lên', 'Bản ghi', 'Bản dịch', 'Giọng đọc', 'Tạo thuyết minh', 'Kết quả',
])

export const displayStatusLabels = Object.freeze({
  ...projectStatusLabels, ...transcriptStatusLabels, ...translationStatusLabels,
  ...voiceStatusLabels, ...processingStatusLabels,
})
