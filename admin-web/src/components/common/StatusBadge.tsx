import { Badge } from './Badge';
import type { ProjectStatus, ProcessingJobStatus, UserStatus } from '../../types/domain';

type Status = ProjectStatus | ProcessingJobStatus | UserStatus;
const labels: Record<Status, string> = {
  ACTIVE: 'Đang hoạt động', BLOCKED: 'Đã khóa', DRAFT: 'Bản nháp', UPLOADED: 'Đã tải lên',
  TRANSCRIBING: 'Đang tạo bản ghi', TRANSCRIBED: 'Đã tạo bản ghi', TRANSLATING: 'Đang dịch',
  TRANSLATED: 'Đã dịch', GENERATING_AUDIO: 'Đang tạo giọng đọc', PROCESSING_VIDEO: 'Đang xử lý video',
  PROCESSING: 'Đang xử lý', COMPLETED: 'Hoàn thành', FAILED: 'Thất bại', QUEUED: 'Đang chờ', CANCELLED: 'Đã hủy',
};

export function StatusBadge({ status }: { status: Status }) {
  const tone = status === 'ACTIVE' || status === 'COMPLETED' ? 'success' : status === 'FAILED' || status === 'BLOCKED' ? 'danger' : status === 'QUEUED' ? 'warning' : status === 'DRAFT' || status === 'CANCELLED' ? 'neutral' : 'primary';
  return <Badge tone={tone}>{labels[status]}</Badge>;
}
