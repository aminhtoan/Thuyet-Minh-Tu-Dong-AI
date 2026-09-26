import { Card } from './Card';
import { Icon, type IconName } from './Icon';
export function StatCard({ label, value, icon, description, change, tone = 'primary' }: { label: string; value: number; icon: IconName; description: string; change?: string; tone?: 'primary' | 'warning' | 'danger' }) {
  return <Card className={'stat-card stat-card--' + tone}><span className="stat-card__icon"><Icon name={icon} /></span><span className="stat-card__label">{label}</span><strong>{value.toLocaleString('vi-VN')}</strong>{change && <span className="stat-card__change">{change}</span>}<small>{description}</small></Card>;
}
