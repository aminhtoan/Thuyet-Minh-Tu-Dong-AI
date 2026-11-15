import { AdminDialog } from '../common/AdminDialog';
import { Button } from '../common/Button';
import type { AdminProject } from '../../types/operations';
import { VideoPublication } from './VideoPublication';

export function VideoPublicationModal({ project, onClose }: { project: AdminProject; onClose: () => void }) {
  return <AdminDialog open onClose={onClose} labelledBy="video-publication-project-title"
    describedBy="video-publication-project-description" className="video-publication-dialog">
    <div className="video-publication-dialog__header">
      <h2 id="video-publication-project-title">{project.name}</h2>
      <Button variant="ghost" onClick={onClose} aria-label="Đóng quản lý video">Đóng</Button>
    </div>
    <p id="video-publication-project-description">Quản lý công khai từng MP4 và ngôn ngữ của dự án này. Mở cửa sổ không tự công khai video hoặc duyệt âm thanh. Đóng cửa sổ không hoàn tác yêu cầu Backend đã nhận.</p>
    <VideoPublication key={project.id} projectId={project.id} />
  </AdminDialog>;
}
