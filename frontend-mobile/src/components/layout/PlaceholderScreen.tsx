import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MobileScreen } from './MobileScreen';

type PlaceholderScreenProps = { title: string; description: string; onAction?: () => void };

export function PlaceholderScreen({ title, description, onAction }: PlaceholderScreenProps) {
  return <MobileScreen title={title} description={description}><Card><EmptyState title={`${title} is ready for development`} description="The mobile shell and reusable UI foundation are in place." action={onAction ? <Button size="sm" onPress={onAction}>Continue</Button> : undefined} /></Card></MobileScreen>;
}
