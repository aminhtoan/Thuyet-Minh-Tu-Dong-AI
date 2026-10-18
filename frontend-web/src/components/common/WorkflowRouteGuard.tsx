import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './Card';
import type { WorkflowRouteAccess } from '../../features/projects/workflowRouteGuard';

export function WorkflowRouteRecovery({ projectId, access }: { projectId: string; access: WorkflowRouteAccess }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <Card padding="lg" className="workflow-route-recovery" role="alert">
    <h2 ref={headingRef} tabIndex={-1}>Bước này chưa thể mở an toàn</h2>
    <p>{access.reason ?? 'Máy chủ chưa xác nhận bước tiếp theo của dự án.'}</p>
    <p>Không có tác vụ xử lý nào được tạo hoặc thử lại khi bạn mở liên kết này.</p>
    <div className="workflow-route-recovery__actions">
      <Link className="button button--primary button--md" to={`/projects/${projectId}`}>Xem chi tiết dự án</Link>
      <Link className="button button--secondary button--md" to="/projects">Dự án của tôi</Link>
    </div>
  </Card>;
}

export function WorkflowReadOnlyNotice({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return <p className="workflow-route-notice" role="status">{reason}</p>;
}
