import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
export function EmptyState({ title, description, icon, action }: { title: string; description: string; icon: IconName; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-state__icon" aria-hidden="true"><Icon name={icon} width="32" height="32" /></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}
