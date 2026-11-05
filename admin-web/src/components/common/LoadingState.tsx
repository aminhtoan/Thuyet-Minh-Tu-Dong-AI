import type { ReactNode } from 'react';

/** Keep controls/rows mounted during refresh; use skeletons only on first load. */
export function LoadingState({ loading, children, label = 'Đang tải dữ liệu' }: { loading: boolean; children: ReactNode; label?: string }) {
  return <div className="admin-loading-region" aria-busy={loading}>
    <span className="sr-only" role="status" aria-atomic="true">{loading ? label : ''}</span>
    {children}
  </div>;
}
