import { Icon, type IconName } from './Icon';
export function EmptyState({ title, description, icon }: { title: string; description: string; icon: IconName }) {
  return <div className="empty-state"><span className="empty-state__icon"><Icon name={icon} width="32" height="32" /></span><h2>{title}</h2><p>{description}</p></div>;
}
