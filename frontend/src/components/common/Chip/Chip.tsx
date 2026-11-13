import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';

interface BaseChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick' | 'aria-label'
> {
  label: string;
  avatar?: ReactNode;
}

export type ChipProps = BaseChipProps &
  (
    | {
        onRemove: () => void;
        removeLabel?: string;
        selected?: never;
        onToggle?: never;
      }
    | {
        selected: boolean;
        onToggle: () => void;
        onRemove?: never;
        removeLabel?: never;
      }
  );

/**
 * Represents a removable input chip or a selectable chip without a trailing icon.
 * @param props - Label, optional avatar, removal or toggle behavior, and native button attributes.
 * @returns A 32px chip within a 48px touch target; selection exposes its pressed state.
 */
export const Chip = ({
  label,
  avatar,
  onRemove,
  selected,
  onToggle,
  removeLabel = `Remove ${label}`,
  className,
  disabled,
  ...props
}: ChipProps) => (
  <button
    {...props}
    type="button"
    aria-label={onToggle ? label : removeLabel}
    aria-pressed={onToggle ? selected : undefined}
    disabled={disabled}
    onClick={onToggle ?? onRemove}
    className={[
      'group inline-flex min-h-12 min-w-12 max-w-full items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40',
      disabled ? '' : 'cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <span
      className={[
        'inline-flex min-h-8 max-w-full items-center gap-2 rounded-lg text-label group-disabled:bg-on-surface/12 group-disabled:text-on-surface motion-safe:transition-colors motion-safe:duration-200',
        onToggle
          ? selected
            ? 'bg-primary text-on-primary group-hover:bg-primary/90'
            : 'bg-surface-container-high text-on-surface-variant group-hover:bg-surface-variant'
          : 'bg-secondary-container text-on-secondary-container group-hover:bg-secondary-container/80',
        onToggle ? 'pr-3' : 'pr-2',
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
      <span className={onToggle ? 'break-words text-left' : 'truncate'}>
        {label}
      </span>
      {!onToggle && <X aria-hidden size={18} className="shrink-0" />}
    </span>
  </button>
);
