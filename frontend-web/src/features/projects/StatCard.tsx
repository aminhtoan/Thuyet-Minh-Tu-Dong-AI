import { Card } from '../../components/common/Card'

type StatCardProps = { label: string; value: number; supportingText: string; tone?: 'default' | 'success' | 'info' | 'error' }

export function StatCard({ label, value, supportingText, tone = 'default' }: StatCardProps) {
  return <Card className={`stat-card stat-card--${tone}`}><span className="stat-card__label">{label}</span><strong>{value}</strong><span className="stat-card__support">{supportingText}</span></Card>
}
