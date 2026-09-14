import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import { LoadingIndicatorAnimator } from './loadingIndicatorAnimation'
import {
  drawLoadingIndicator,
  setupLoadingIndicatorCanvas,
} from './loadingIndicatorCanvas'
import { getLoadingIndicatorShape } from './loadingIndicatorShapes'

export interface LoadingIndicatorProps extends Omit<
  HTMLAttributes<HTMLCanvasElement>,
  'children'
> {
  /** Accessible description announced for the indeterminate operation. */
  label?: string
  /** Square CSS size in pixels. */
  size?: number
  /** CSS color used for the morphing shape; defaults to inherited text color. */
  color?: string
  /** Draws the Material circular container behind the morphing shape. */
  contained?: boolean
  /** CSS color used by the optional circular container. */
  containerColor?: string
  /** Milliseconds between morphs; rotation slows with the same Material cycle. */
  shapeDuration?: number
}

/**
 * Tracks the user's reduced-motion preference with a live media-query
 * subscription so the canvas can pause without requiring a remount.
 *
 * @returns Whether non-essential animation should be suppressed.
 */
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')

    /**
     * Copies the current media-query match into React state.
     *
     * @returns Nothing; state is updated in place.
     */
    const updatePreference = () => setPrefersReducedMotion(query.matches)

    updatePreference()
    query.addEventListener('change', updatePreference)
    return () => query.removeEventListener('change', updatePreference)
  }, [])

  return prefersReducedMotion
}

/**
 * Renders the Material 3 expressive indeterminate loading indicator. A canvas
 * morphs through the seven official shapes using Material's spring and dual
 * rotation motion; reduced-motion users receive a static shape.
 *
 * @param props - Visual, accessibility, and native canvas properties.
 * @returns An accessible, resolution-independent loading canvas.
 */
function LoadingIndicator({
  label = 'Loading',
  size = 48,
  color,
  contained = false,
  containerColor = 'rgb(0 106 102 / 0.12)',
  shapeDuration,
  style,
  ...canvasProps
}: LoadingIndicatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef(0)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = setupLoadingIndicatorCanvas(canvas, size)
    if (!context) return

    const animator = new LoadingIndicatorAnimator(shapeDuration)
    const resolvedColor = color ?? getComputedStyle(canvas).color

    /**
     * Advances Material motion and repaints the current morphed shape.
     *
     * @param timestamp - requestAnimationFrame timestamp in milliseconds.
     * @returns Nothing; schedules the next frame unless motion is reduced.
     */
    const renderFrame = (timestamp: number) => {
      const snapshot = animator.update(timestamp)
      drawLoadingIndicator(
        context,
        size,
        getLoadingIndicatorShape(snapshot.morph),
        snapshot.rotation,
        {
          color: resolvedColor,
          contained,
          containerColor,
          sizeRatio: 38 / 48,
        },
      )

      if (!prefersReducedMotion) {
        animationFrameRef.current = requestAnimationFrame(renderFrame)
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [
    color,
    contained,
    containerColor,
    prefersReducedMotion,
    shapeDuration,
    size,
  ])

  const mergedStyle: CSSProperties = {
    display: 'block',
    height: size,
    width: size,
    ...style,
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={label}
      role="progressbar"
      style={mergedStyle}
      {...canvasProps}
    />
  )
}

export default LoadingIndicator
