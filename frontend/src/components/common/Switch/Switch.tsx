import type { InputHTMLAttributes } from 'react';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role' | 'size'
> {
  label: string;
}

/**
 * Renders a controlled-capable MD3 switch with a 52×32 track and 48px touch target.
 * @param props - Accessible label and native checkbox attributes, including checked and onChange.
 * @returns A keyboard-accessible switch with animated thumb and disabled styling.
 */
export const Switch = ({
  label,
  className,
  disabled,
  ...props
}: SwitchProps) => (
  <label
    className={[
      'relative inline-flex h-12 w-13 shrink-0 items-center',
      disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <input
      {...props}
      type="checkbox"
      role="switch"
      aria-label={label}
      disabled={disabled}
      className="peer absolute inset-0 z-10 m-0 size-full cursor-inherit opacity-0"
    />
    <span
      aria-hidden="true"
      className="pointer-events-none relative h-8 w-13 rounded-full border-2 border-outline bg-surface-container-high peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary motion-safe:transition-colors motion-safe:duration-200 peer-checked:[&>span]:left-6 peer-checked:[&>span]:size-6 peer-checked:[&>span]:bg-on-primary"
    >
      <span className="absolute top-1/2 left-1.5 size-4 -translate-y-1/2 rounded-full bg-outline motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-standard" />
    </span>
  </label>
);
