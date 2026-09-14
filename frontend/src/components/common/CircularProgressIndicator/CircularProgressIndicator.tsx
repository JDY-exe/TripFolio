import type { CSSProperties, SVGAttributes } from 'react';
import {
  createCircularProgressGeometry,
  getCircularProgressDashes,
  normalizeCircularProgress,
} from './circularProgressGeometry';

export interface CircularProgressIndicatorProps extends Omit<
  SVGAttributes<SVGSVGElement>,
  'children' | 'color'
> {
  /** Current progress. Omitted from accessibility output when indeterminate. */
  value?: number;
  /** Value representing completion. */
  max?: number;
  /** Whether progress is unknown and should animate continuously. */
  indeterminate?: boolean;
  /** Accessible description announced with the progress state. */
  label?: string;
  /** Square rendered size in pixels. */
  size?: number;
  /** Width of the active indicator and track in pixels. */
  thickness?: number;
  /** CSS color used for the active indicator. */
  color?: string;
  /** CSS color used for the inactive track. */
  trackColor?: string;
  /** Radial height of the expressive wave in pixels. Set to zero for a circle. */
  waveAmplitude?: number;
  /** Approximate distance in pixels between wave crests. */
  wavelength?: number;
  /** Gap in pixels between determinate active and inactive arcs. */
  gap?: number;
  /** Duration of one indeterminate animation cycle in milliseconds. */
  animationDuration?: number;
}

/**
 * Renders an M3 Expressive circular progress indicator as a scalable wavy SVG.
 * A normalized path supports determinate values and the indeterminate state
 * animates its active segment while respecting reduced-motion preferences.
 *
 * @param props - Progress state, visual tokens, accessibility, and SVG props.
 * @returns An accessible circular progress SVG.
 */
function CircularProgressIndicator({
  value = 0,
  max = 100,
  indeterminate = false,
  label = 'Progress',
  size = 52,
  thickness = 4,
  color = 'var(--color-primary)',
  trackColor = 'var(--color-primary-container)',
  waveAmplitude = 2,
  wavelength = 14,
  gap = 6,
  animationDuration = 1_600,
  className,
  style,
  ...svgProps
}: CircularProgressIndicatorProps) {
  const safeSize = Number.isFinite(size) ? Math.max(1, size) : 52;
  const safeThickness = Number.isFinite(thickness)
    ? Math.min(safeSize, Math.max(1, thickness))
    : 8;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const progress = normalizeCircularProgress(value, safeMax);
  const geometry = createCircularProgressGeometry(
    safeSize,
    safeThickness,
    waveAmplitude,
    wavelength,
  );
  const dashes = getCircularProgressDashes(progress, gap, geometry.radius);
  const mergedStyle: CSSProperties = {
    display: 'block',
    height: safeSize,
    width: safeSize,
    ...style,
  };
  const activeStyle: CSSProperties = indeterminate
    ? {
        animationDuration: `${Math.max(1, animationDuration * 1.25)}ms, ${Math.max(1, animationDuration)}ms`,
      }
    : {};

  return (
    <svg
      {...svgProps}
      aria-label={label}
      aria-valuemax={indeterminate ? undefined : safeMax}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuenow={indeterminate ? undefined : progress * safeMax}
      className={[
        'shrink-0 overflow-visible',
        indeterminate && 'circular-progress-indicator--indeterminate',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      focusable="false"
      role="progressbar"
      style={mergedStyle}
      viewBox={`0 0 ${safeSize} ${safeSize}`}
    >
      <circle
        cx={safeSize / 2}
        cy={safeSize / 2}
        fill="none"
        pathLength="100"
        r={geometry.radius}
        stroke={trackColor}
        strokeDasharray={indeterminate ? undefined : dashes.track}
        strokeDashoffset={indeterminate ? undefined : dashes.trackOffset}
        strokeLinecap="round"
        strokeWidth={safeThickness}
        transform={`rotate(-90 ${safeSize / 2} ${safeSize / 2})`}
      />
      <path
        className={
          indeterminate
            ? 'circular-progress-indicator__active--indeterminate'
            : undefined
        }
        d={geometry.path}
        fill="none"
        pathLength="100"
        stroke={color}
        strokeDasharray={indeterminate ? '24 76' : dashes.active}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={safeThickness}
        style={activeStyle}
      />
    </svg>
  );
}

export default CircularProgressIndicator;
