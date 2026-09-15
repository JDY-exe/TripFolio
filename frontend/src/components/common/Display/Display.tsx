import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  ReactNode,
} from 'react';

const displaySizes = {
  hero: 'text-[clamp(3.5rem,9vw,6rem)] leading-[0.88] tracking-[-0.055em]',
  headline:
    'text-[clamp(2.75rem,7vw,4.5rem)] leading-[0.92] tracking-[-0.045em]',
} as const;

const displayColors = {
  inherit: 'text-inherit',
  default: 'text-on-surface',
  muted: 'text-on-surface-variant',
  primary: 'text-primary',
} as const;

export type DisplaySize = keyof typeof displaySizes;
export type DisplayColor = keyof typeof displayColors;

type DisplayOwnProps<T extends ElementType> = {
  /** Semantic HTML element rendered for the display copy. */
  as?: T;
  /** Fluid display scale applied independently of document hierarchy. */
  size?: DisplaySize;
  /** Semantic foreground color. */
  color?: DisplayColor;
  /** Google Sans Flex weight axis, ranging from 1 to 1000. */
  weight?: number;
  /** Google Sans Flex width axis, ranging from 25 to 151. */
  width?: number;
  /** Google Sans Flex optical-size axis, ranging from 6 to 144. */
  opticalSize?: number;
  /** Google Sans Flex slant axis, ranging from -10 to 0. */
  slant?: number;
  /** Google Sans Flex grade axis, ranging from 0 to 100. */
  grade?: number;
  /** Google Sans Flex roundness axis, ranging from 0 to 100. */
  roundness?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export type DisplayProps<T extends ElementType = 'p'> = DisplayOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof DisplayOwnProps<T>>;

/**
 * Renders expressive display copy with direct access to all six Google Sans
 * Flex axes. Semantic element choice stays independent from visual scale, while
 * inline variation settings let each headline carry a distinct personality.
 *
 * @param props - Semantic element, display scale, color, and variable-font axes.
 * @returns A polymorphic display-text element using the shared expressive font.
 */
function Display<T extends ElementType = 'p'>({
  as,
  size = 'hero',
  color = 'default',
  weight = 620,
  width = 100,
  opticalSize = 72,
  slant = 0,
  grade = 0,
  roundness = 0,
  className,
  style,
  children,
  ...props
}: DisplayProps<T>) {
  const Component = as ?? 'p';
  const variationSettings = [
    `'wght' ${weight}`,
    `'wdth' ${width}`,
    `'opsz' ${opticalSize}`,
    `'slnt' ${slant}`,
    `'GRAD' ${grade}`,
    `'ROND' ${roundness}`,
  ].join(', ');

  return (
    <Component
      className={[
        'font-display',
        displaySizes[size],
        displayColors[color],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ fontVariationSettings: variationSettings, ...style }}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Display;
