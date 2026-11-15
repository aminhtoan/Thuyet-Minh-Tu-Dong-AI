import { AdminDialog } from '../common/AdminDialog';
import { Button } from '../common/Button';
import type { AdminProject } from '../../types/operations';
import { OriginalAudioPublication } from './OriginalAudioPublication';

export function OriginalAudioPublicationModal({ project, onClose }: { project: AdminProject; onClose: () => void }) {
  return <AdminDialog open onClose={onClose} labelledBy="original-publication-project-title"
    describedBy="original-publication-project-description" className="original-publication-dialog">
    <div className="original-publication-dialog__header">
      <h2 id="original-publication-project-title">{project.name}</h2>
      <Button variant="ghost" onClick={onClose} aria-label="Đóng quản lý âm thanh gốc">Đóng</Button>
    </div>
    <p id="original-publication-project-description">Quản lý công khai âm thanh gốc của dự án này. Đóng cửa sổ không hủy tác vụ đang xử lý.</p>
    <OriginalAudioPublication key={project.id} projectId={project.id} />
  </AdminDialog>;
}
