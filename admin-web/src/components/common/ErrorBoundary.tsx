import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', maxWidth: '600px', margin: '40px auto' }}>
          <Card>
            <EmptyState
              icon="alert"
              title="Đã xảy ra lỗi hiển thị"
              description={this.state.error?.message || 'Có lỗi ngoài ý muốn khi tải trang này.'}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
              <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
              <Button variant="secondary" onClick={() => { window.location.href = '/dashboard'; }}>
                Về bảng điều khiển
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
