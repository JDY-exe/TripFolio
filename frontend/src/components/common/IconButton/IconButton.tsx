import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  buttonVariants,
  type ButtonVariant,
  type ControlSize,
} from '../styles/componentStyles'

const iconButtonSizes = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-12',
} satisfies Record<ControlSize, string>

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: ButtonVariant
  size?: ControlSize
  icon: ReactNode
}

/**
 * Renders a square, icon-only native button with a required accessible name.
 * It maps shared semantic variants and control sizes to a compact circular action.
 *
 * @param props - Native button attributes and icon-control tokens.
 * @param props.aria-label - Accessible action name required for icon-only controls.
 * @param props.variant - Semantic color treatment for the action.
 * @param props.size - Equal width and height scale for the control.
 * @param props.icon - Icon displayed inside the button.
 * @returns An accessible tokenized icon button.
 */
function IconButton({
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  icon,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={[
        'grid shrink-0 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-200 motion-safe:ease-standard',
        buttonVariants[variant],
        iconButtonSizes[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {icon}
    </button>
  )
}

export default IconButton
