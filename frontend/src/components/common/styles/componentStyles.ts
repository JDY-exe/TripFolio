export const controlSizes = {
  sm: 'min-h-9 gap-1.5 px-3 py-2',
  md: 'min-h-11 gap-2 px-5 py-2.5',
  lg: 'min-h-12 gap-2 px-6 py-3',
} as const

export const buttonVariants = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
  secondary:
    'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
  outline:
    'border border-outline bg-transparent text-primary hover:bg-primary/8',
  ghost: 'bg-transparent text-primary hover:bg-primary/8',
  danger: 'bg-error text-on-error hover:bg-error/90',
} as const

export type ControlSize = keyof typeof controlSizes
export type ButtonVariant = keyof typeof buttonVariants

const buttonBase =
  'inline-flex cursor-pointer items-center justify-center rounded-full text-label select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-200 motion-safe:ease-standard'

/**
 * Builds the class list for a tokenized button treatment.
 * It combines the shared interaction styles with one semantic color and size token.
 *
 * @param variant - Semantic color treatment applied to the control.
 * @param size - Height, padding, and gap scale applied to the control.
 * @param fullWidth - Whether the control should fill its container.
 * @param className - Optional classes supplied by the consuming feature.
 * @returns A Tailwind class string for a button-like control.
 */
export function getButtonClasses(
  variant: ButtonVariant,
  size: ControlSize,
  fullWidth: boolean,
  className?: string,
) {
  return [
    buttonBase,
    buttonVariants[variant],
    controlSizes[size],
    fullWidth ? 'w-full' : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
