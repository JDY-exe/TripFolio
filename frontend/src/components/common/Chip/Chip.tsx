import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick' | 'aria-label'
> {
  label: string;
  avatar?: ReactNode;
  onRemove: () => void;
  removeLabel?: string;
}

/**
 * Represents a removable selection using MD3 input-chip dimensions and colors.
 * @param props - Selection label, optional avatar, removal callback, and native button attributes.
 * @returns A 32px chip within a 48px touch target; Enter or Space removes the selection.
 */
export const Chip = ({
  label,
  avatar,
  onRemove,
  removeLabel = `Remove ${label}`,
  className,
  disabled,
  ...props
}: ChipProps) => (
  <button
    {...props}
    type="button"
    aria-label={removeLabel}
    disabled={disabled}
    onClick={onRemove}
    className={[
      'group inline-flex min-h-12 min-w-12 max-w-full items-center rounded-lg text-on-secondary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40',
      disabled ? '' : 'cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <span
      className={[
        'inline-flex h-8 max-w-full items-center gap-2 rounded-lg bg-secondary-container pr-2 text-label group-hover:bg-secondary-container/80 group-disabled:bg-on-surface/12 group-disabled:text-on-surface motion-safe:transition-colors motion-safe:duration-200',
        avatar ? 'pl-1' : 'pl-3',
      ].join(' ')}
    >
      {!!avatar && (
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-high [&>img]:size-full [&>img]:object-cover"
        >
          {avatar}
        </span>
      )}
      <span className="truncate">{label}</span>
      <X aria-hidden size={18} className="shrink-0" />
    </span>
  </button>
);
