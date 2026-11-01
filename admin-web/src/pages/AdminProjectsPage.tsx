import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { OperationPagination, OperationProgress, OperationSkeleton } from '../components/operations/OperationsCommon';
import { NarrationApprovalModal } from '../components/operations/NarrationApprovalModal';
import { useProjects } from '../hooks/useOperations';
import type { AdminProject, MediaType } from '../types/operations';
import type { ProjectStatus } from '../types/domain';

export function AdminProjectsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'ALL'>('ALL');
  const [mediaType, setMediaType] = useState<MediaType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [approvalProject, setApprovalProject] = useState<AdminProject | null>(null);

  const { data, loading, error, retry } = useProjects({ search, status, mediaType, page, limit: 10 });

  return (
    <>
      <AdminPageHeader title="Dự án" description="Theo dõi toàn bộ dự án thuyết minh trong hệ thống." />
      {loading ? (
        <OperationSkeleton />
      ) : error || !data ? (
        <Card>
          <EmptyState icon="alert" title="Không thể tải danh sách dự án" description="Vui lòng thử lại." />
          <Button onClick={retry}>Thử lại</Button>
        </Card>
      ) : (
        <Card className="operation-list-card">
          <div className="operation-filters">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo dự án hoặc người tạo..."
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ProjectStatus | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {[
                'DRAFT',
                'UPLOADED',
                'TRANSCRIBING',
                'TRANSCRIBED',
                'TRANSLATING',
                'TRANSLATED',
                'GENERATING_AUDIO',
                'PROCESSING_VIDEO',
                'COMPLETED',
                'FAILED',
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              value={mediaType}
              onChange={(e) => {
                setMediaType(e.target.value as MediaType | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả phương tiện</option>
              <option value="VIDEO">Video</option>
              <option value="AUDIO">Âm thanh</option>
            </select>
          </div>

          {data.items.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '70px', textAlign: 'center' }}>Duyệt</th>
                      <th>Dự án</th>
                      <th>Người tạo</th>
                      <th>Ngôn ngữ</th>
                      <th>Phương tiện</th>
                      <th>Trạng thái</th>
                      <th>Tiến độ</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((p) => {
                      const isCompleted = p.status === 'COMPLETED';
                      const isApproved = isCompleted && p.narrationApproval?.status === 'ALL_APPROVED';
                      return (
                        <tr key={p.id}>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`narration-approval-btn ${isApproved ? 'narration-approval-btn--approved' : ''}`}
                              disabled={!isCompleted}
                              onClick={() => isCompleted && setApprovalProject(p)}
                              title={
                                !isCompleted
                                  ? 'Chỉ có thể duyệt khi dự án đã hoàn thành'
                                  : isApproved
                                  ? 'Đã duyệt phát hành (Bấm để xem/chỉnh sửa)'
                                  : 'Chưa duyệt phát hành (Bấm để duyệt)'
                              }
                            >
                              Duyệt
                            </button>
                          </td>
                          <td>
                            <strong>{p.name}</strong>
                            <small>{p.id}</small>
                          </td>
                          <td>{p.customerName}</td>
                          <td>
                            {p.sourceLanguage.toUpperCase()} →{' '}
                            {p.targetLanguages.map((x) => x.toUpperCase()).join(', ') || '—'}
                          </td>
                          <td>
                            {p.mediaType === 'VIDEO'
                              ? 'Video'
                              : p.mediaType === 'AUDIO'
                              ? 'Âm thanh'
                              : 'Chưa tải lên'}
                          </td>
                          <td>
                            <StatusBadge status={p.status} />
                          </td>
                          <td>
                            <OperationProgress value={p.progress} label={`Tiến độ ${p.name}`} />
                          </td>
                          <td>
                            <Link to={`/projects/${p.id}`} className="link-view">
                              Xem
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <OperationPagination value={data.pagination} onPage={setPage} />
            </>
          ) : (
            <EmptyState icon="projects" title="Không có dự án phù hợp" description="Hãy thay đổi bộ lọc." />
          )}
        </Card>
      )}

      {approvalProject && (
        <NarrationApprovalModal
          project={approvalProject}
          onClose={() => setApprovalProject(null)}
          onUpdated={retry}
        />
      )}
    </>
  );
}
