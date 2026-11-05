import { Button } from './Button';
import { EmptyState } from './EmptyState';

export function ErrorState({ title, description, onRetry, pending = false }: { title: string; description: string; onRetry?: () => void; pending?: boolean }) {
  return <div className="admin-error-state" role="alert">
    <EmptyState icon="alert" title={title} description={description}
      action={onRetry ? <Button onClick={onRetry} disabled={pending}>Thử lại</Button> : undefined} />
  </div>;
}
