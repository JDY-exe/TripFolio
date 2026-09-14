import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

const textVariants = {
  display: 'text-4xl leading-tight tracking-tight',
  headline: 'text-headline tracking-tight',
  title: 'text-title',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-xs leading-4',
} as const

const textColors = {
  inherit: 'text-inherit',
  default: 'text-on-surface',
  muted: 'text-on-surface-variant',
  primary: 'text-primary',
  error: 'text-error',
  'on-primary': 'text-on-primary',
} as const

export type TextVariant = keyof typeof textVariants
export type TextColor = keyof typeof textColors

type TextOwnProps<T extends ElementType> = {
  as?: T
  variant?: TextVariant
  color?: TextColor
  children: ReactNode
  className?: string
}

export type TextProps<T extends ElementType = 'p'> = TextOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps<T>>

/**
 * Renders typography using the TripFolio type and semantic color scales.
 * The `as` prop selects the correct HTML element without coupling visual style
 * to document hierarchy.
 *
 * @param props - Element attributes and typography tokens.
 * @param props.as - Semantic HTML element to render.
 * @param props.variant - Type scale applied independently of the HTML element.
 * @param props.color - Semantic foreground color.
 * @param props.children - Text or inline content to display.
 * @returns A semantic element styled with typography tokens.
 */
function Text<T extends ElementType = 'p'>({
  as,
  variant = 'body',
  color = 'default',
  className,
  children,
  ...props
}: TextProps<T>) {
  const Component = as ?? 'p'

  return (
    <Component
      className={[textVariants[variant], textColors[color], className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Text
