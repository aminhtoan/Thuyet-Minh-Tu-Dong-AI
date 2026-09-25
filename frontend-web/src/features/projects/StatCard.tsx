import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
type StatCardProps = { label: string; value: number; supportingText: string; tone?: 'default' | 'success' | 'info' | 'error' };
export function StatCard({ label, value, supportingText, tone = 'default' }: StatCardProps) {
  return <Card className={'stat-card stat-card--' + tone}><span className="stat-card__icon"><Icon name={tone === 'success' ? 'check' : tone === 'info' ? 'history' : tone === 'error' ? 'alert' : 'document'} width="20" /></span><div><strong>{value}</strong><span className="stat-card__label">{label}</span><span className="visually-hidden">{supportingText}</span></div></Card>;
}
