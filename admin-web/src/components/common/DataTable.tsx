import { useId, type ReactNode } from 'react';
import { LoadingState } from './LoadingState';

/** Native table children (thead/tbody). Sorting remains controlled by the caller. */
export function DataTable({ caption, children, loading = false, className = '', minWidth }: {
  caption: string; children: ReactNode; loading?: boolean; className?: string; minWidth?: number;
}) {
  const captionId = useId();
  return <LoadingState loading={loading}>
    <div className="table-scroll admin-data-table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className={`admin-data-table ${className}`} style={minWidth ? { minWidth } : undefined}>
        <caption id={captionId} className="sr-only">{caption}</caption>{children}
      </table>
    </div>
  </LoadingState>;
}
