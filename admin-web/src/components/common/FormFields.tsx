import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';

type FieldLabel = { label: string; hideLabel?: boolean };
export function SearchField({ label, hideLabel = false, id, className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & FieldLabel) {
  const generated = useId();
  const fieldId = id ?? generated;
  return <label htmlFor={fieldId} className={`admin-field admin-search-field ${className}`}>
    <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
    <span className="admin-search-control"><Icon name="search" /><input {...props} id={fieldId} type="search" /></span>
  </label>;
}
export function FilterSelect({ label, hideLabel = false, id, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & FieldLabel) {
  const generated = useId();
  const fieldId = id ?? generated;
  return <label htmlFor={fieldId} className={`admin-field ${className}`}>
    <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
    <select {...props} id={fieldId}>{children}</select>
  </label>;
}
