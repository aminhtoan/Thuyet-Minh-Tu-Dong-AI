import type { ReactNode } from 'react';
export function AdminPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div className="page-header__copy"><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-header__actions">{action}</div>}</header>;
}
