import type { ReactNode } from 'react';
export function AdminPageContainer({ children }: { children: ReactNode }) {
  return <main id="admin-content" tabIndex={-1} className="page-container">{children}</main>;
}
