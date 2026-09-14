export interface CircularProgressGeometry {
  /** SVG path for the circular or expressive wavy track. */
  path: string;
  /** Normalized base radius used to estimate physical track gaps. */
  radius: number;
}

export interface CircularProgressDashes {
  /** Dash pattern for the active indicator on a 100-unit path. */
  active: string;
  /** Dash pattern for the inactive track on a 100-unit path. */
  track: string;
  /** Offset that positions the inactive track after the active indicator. */
  trackOffset: number;
}

/**
 * Restricts a numeric value to an inclusive range. Comparisons keep the
 * helper stable for values outside the component's supported geometry.
 *
 * @param value - Number to constrain.
 * @param minimum - Smallest allowed result.
 * @param maximum - Largest allowed result.
 * @returns The value constrained between the supplied bounds.
 */
function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Replaces a non-finite number with a stable fallback before SVG calculations.
 * This prevents malformed consumer input from producing invalid path commands.
 *
 * @param value - Number supplied to a geometry calculation.
 * @param fallback - Safe value used when the input is not finite.
 * @returns The finite input or its fallback.
 */
function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Converts progress values into a safe zero-to-one fraction. Non-finite
 * values and non-positive maxima resolve to zero instead of invalid SVG data.
 *
 * @param value - Current progress value.
 * @param max - Value representing completion.
 * @returns Progress normalized to the inclusive range from zero to one.
 */
export function normalizeCircularProgress(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return clamp(value / max, 0, 1);
}

/**
 * Creates a closed SVG path around a circle. When amplitude is positive, its
 * radius oscillates at an integer frequency so the final wave joins smoothly.
 *
 * @param size - Width and height of the square SVG viewport.
 * @param thickness - Stroke width reserved inside the viewport.
 * @param waveAmplitude - Radial height of the expressive wave in pixels.
 * @param wavelength - Approximate distance between wave crests in pixels.
 * @returns The path and its base radius for subsequent dash calculations.
 */
export function createCircularProgressGeometry(
  size: number,
  thickness: number,
  waveAmplitude: number,
  wavelength: number,
): CircularProgressGeometry {
  const safeSize = Math.max(1, finiteOr(size, 1));
  const safeThickness = clamp(finiteOr(thickness, 1), 1, safeSize);
  const maximumAmplitude = Math.max(0, (safeSize - safeThickness) / 4);
  const amplitude = clamp(finiteOr(waveAmplitude, 0), 0, maximumAmplitude);
  const radius = Math.max(0, safeSize / 2 - safeThickness / 2 - amplitude);
  const circumference = 2 * Math.PI * radius;
  const waveCount = Math.max(
    3,
    Math.round(circumference / Math.max(1, finiteOr(wavelength, 1))),
  );
  const sampleCount = Math.max(96, waveCount * 16);
  const center = safeSize / 2;
  const points = Array.from({ length: sampleCount }, (_, index) => {
    const angle = (index / sampleCount) * Math.PI * 2 - Math.PI / 2;
    const animatedRadius =
      radius + amplitude * Math.sin(waveCount * (angle + Math.PI / 2));
    return [
      center + animatedRadius * Math.cos(angle),
      center + animatedRadius * Math.sin(angle),
    ] as const;
  });

  const path = points
    .map(
      ([x, y], index) =>
        `${index === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`,
    )
    .join(' ');

  return { path: `${path} Z`, radius };
}

/**
 * Builds normalized dash patterns for determinate active and inactive arcs.
 * The inactive segment is shortened and shifted to leave a visible gap at
 * both rounded ends of the active indicator.
 *
 * @param progress - Normalized progress fraction.
 * @param gap - Desired visual separation in pixels.
 * @param radius - Base radius of the circular path in pixels.
 * @returns SVG dash patterns expressed against a 100-unit path length.
 */
export function getCircularProgressDashes(
  progress: number,
  gap: number,
  radius: number,
): CircularProgressDashes {
  const fraction = clamp(progress, 0, 1);

  if (fraction <= 0) {
    return { active: '0 100', track: '100 0', trackOffset: 0 };
  }

  if (fraction >= 1) {
    return { active: '100 0', track: '0 100', trackOffset: 0 };
  }

  const circumference = 2 * Math.PI * radius;
  const normalizedGap =
    circumference > 0 ? Math.max(0, finiteOr(gap, 0)) / circumference : 0;
  const boundedGap = Math.min(normalizedGap, fraction / 2, (1 - fraction) / 2);
  const trackLength = Math.max(0, 1 - fraction - boundedGap * 2);

  return {
    active: `${fraction * 100} ${100 - fraction * 100}`,
    track: `${trackLength * 100} ${100 - trackLength * 100}`,
    trackOffset: -(fraction + boundedGap) * 100,
  };
}
