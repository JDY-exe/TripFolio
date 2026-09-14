/**
 * Material 3 expressive loading-indicator motion.
 *
 * Adapted for TripFolio from Aler1x/m3-loading-indicator and Android's
 * LoadingIndicatorAnimatorDelegate.java under the Apache License 2.0.
 */

export const DURATION_PER_SHAPE_MS = 650;
export const CONSTANT_ROTATION_DEGREES = 50;
export const EXTRA_ROTATION_DEGREES = 90;
export const SPRING_STIFFNESS = 200;
export const SPRING_DAMPING_RATIO = 0.6;

export interface LoadingAnimationSnapshot {
  morph: number;
  rotation: number;
}

/**
 * Simulates the damped spring used by Material to overshoot and settle each
 * shape transition. Small Euler substeps keep the result stable across frames.
 */
class Spring {
  private readonly stiffness: number;
  private readonly damping: number;

  position = 0;
  velocity = 0;
  target = 0;

  /**
   * Creates a unit-mass damped spring from Material's motion constants.
   *
   * @param stiffness - Force pulling the spring toward its target.
   * @param dampingRatio - Fraction of critical damping applied to motion.
   */
  constructor(stiffness: number, dampingRatio: number) {
    this.stiffness = stiffness;
    this.damping = dampingRatio * 2 * Math.sqrt(stiffness);
  }

  /**
   * Advances spring position using twelve semi-implicit Euler substeps.
   *
   * @param seconds - Elapsed simulation time in seconds.
   * @returns Nothing; position and velocity are updated in place.
   */
  step(seconds: number) {
    const substeps = 12;
    const stepSeconds = seconds / substeps;

    for (let index = 0; index < substeps; index += 1) {
      const acceleration =
        -this.stiffness * (this.position - this.target) -
        this.damping * this.velocity;
      this.velocity += acceleration * stepSeconds;
      this.position += this.velocity * stepSeconds;
    }
  }
}

/**
 * Drives Material's 650 ms shape sequence and combined constant/spring
 * rotation. Timestamps are converted into bounded frame deltas for stability.
 */
export class LoadingIndicatorAnimator {
  private readonly spring = new Spring(SPRING_STIFFNESS, SPRING_DAMPING_RATIO);
  private readonly shapeDuration: number;
  private morphTarget = 1;
  private elapsedMs = 0;
  private previousCycle = 0;
  private lastTimestamp = 0;

  morph = 0;
  rotation = 0;

  /**
   * Creates an animator starting at the soft-burst shape and targeting the next
   * Material shape through the configured spring.
   *
   * @param shapeDuration - Milliseconds between shape transitions.
   */
  constructor(shapeDuration = DURATION_PER_SHAPE_MS) {
    this.shapeDuration = Math.max(1, shapeDuration);
    this.spring.target = this.morphTarget;
  }

  /**
   * Advances the animation to a requestAnimationFrame timestamp.
   *
   * @param timestamp - High-resolution frame timestamp in milliseconds.
   * @returns The current morph fraction and rotation for canvas rendering.
   */
  update(timestamp: number): LoadingAnimationSnapshot {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      return this.snapshot();
    }

    const seconds = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;
    if (seconds <= 0) return this.snapshot();

    this.elapsedMs += seconds * 1000;
    const cycle = Math.floor(this.elapsedMs / this.shapeDuration);

    if (cycle > this.previousCycle) {
      this.morphTarget += cycle - this.previousCycle;
      this.spring.target = this.morphTarget;
      this.previousCycle = cycle;
    }

    const timeFraction =
      (this.elapsedMs % this.shapeDuration) / this.shapeDuration;
    this.spring.step(seconds);

    const morphBase = this.morphTarget - 1;
    const springFraction = this.spring.position - morphBase;
    this.rotation =
      ((CONSTANT_ROTATION_DEGREES + EXTRA_ROTATION_DEGREES) * morphBase +
        CONSTANT_ROTATION_DEGREES * timeFraction +
        EXTRA_ROTATION_DEGREES * springFraction) %
      360;
    this.morph = this.spring.position;

    return this.snapshot();
  }

  /**
   * Returns an immutable representation of the current drawing state.
   *
   * @returns Current morph position and rotation in degrees.
   */
  snapshot(): LoadingAnimationSnapshot {
    return { morph: this.morph, rotation: this.rotation };
  }
}
