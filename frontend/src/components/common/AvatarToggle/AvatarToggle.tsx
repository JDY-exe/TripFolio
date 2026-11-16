import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { Avatar } from '../Avatar/Avatar';
import Text from '../Text';

export interface AvatarToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick' | 'aria-pressed'
> {
  label: string;
  imageUrl?: string | null;
  selected: boolean;
  onToggle: () => void;
}

/** Toggles a person using an avatar border and checkmark without shifting the grid.
 * @param props - Full username, optional photo, controlled selection, and native button attributes.
 * @returns A keyboard-accessible toggle with a two-line visible label and full accessible name.
 */
export const AvatarToggle = ({
  label,
  imageUrl,
  selected,
  onToggle,
  disabled,
  className,
  ...props
}: AvatarToggleProps) => (
  <button
    {...props}
    type="button"
    aria-label={label}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onToggle}
    title={label}
    className={`group flex min-h-28 min-w-0 cursor-pointer flex-col items-center gap-2 rounded-xl px-1 py-2 text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 ${className ?? ''}`}
  >
    <span
      data-cy="avatar-toggle-border"
      className={`relative rounded-full border-2 p-1 motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-standard ${selected ? 'border-primary' : 'border-transparent group-hover:border-outline-variant'}`}
    >
      <Avatar imageUrl={imageUrl} size="lg" />
      <span
        data-cy="avatar-toggle-check"
        aria-hidden="true"
        className={`absolute bottom-0 right-0 grid size-6 place-items-center rounded-full border-2 border-surface-container-low bg-primary text-on-primary motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-standard ${selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
      >
        <Check aria-hidden size={14} strokeWidth={3} />
      </span>
    </span>
    <Text
      as="span"
      variant="label"
      className="line-clamp-2 w-full break-words text-center font-normal [overflow-wrap:anywhere]"
    >
      {label}
    </Text>
  </button>
);
