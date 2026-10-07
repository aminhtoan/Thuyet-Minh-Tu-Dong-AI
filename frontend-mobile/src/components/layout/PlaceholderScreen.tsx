import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MobileScreen } from './MobileScreen';

type PlaceholderScreenProps = { title: string; description: string; onAction?: () => void };

export function PlaceholderScreen({ title, description, onAction }: PlaceholderScreenProps) {
  return <MobileScreen title={title} description={description}><Card><EmptyState title={`${title} đã sẵn sàng để phát triển`} description="Khung ứng dụng Mobile và nền tảng giao diện tái sử dụng đã sẵn sàng." action={onAction ? <Button size="sm" onPress={onAction}>Tiếp tục</Button> : undefined} /></Card></MobileScreen>;
}
