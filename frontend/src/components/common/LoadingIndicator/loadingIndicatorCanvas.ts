/**
 * Canvas rendering helpers for the Material 3 expressive loading indicator.
 * Adapted for TripFolio from Apache-2.0 licensed Aler1x/m3-loading-indicator.
 */

import type { LoadingIndicatorPoint } from './loadingIndicatorShapes'

export interface LoadingIndicatorRenderOptions {
  color: string
  contained: boolean
  containerColor: string
  sizeRatio: number
}

/**
 * Sizes a canvas for its CSS dimensions and device pixel ratio so animated
 * edges remain crisp on high-density displays.
 *
 * @param canvas - Canvas element to configure.
 * @param size - Square CSS size in pixels.
 * @returns A two-dimensional context scaled to CSS pixels.
 */
export function setupLoadingIndicatorCanvas(
  canvas: HTMLCanvasElement,
  size: number,
): CanvasRenderingContext2D | null {
  const pixelRatio = window.devicePixelRatio || 1
  const pixelSize = Math.round(size * pixelRatio)
  canvas.width = pixelSize
  canvas.height = pixelSize
  canvas.style.width = `${size}px`
  canvas.style.height = `${size}px`

  const context = canvas.getContext('2d')
  context?.scale(pixelRatio, pixelRatio)
  return context
}

/**
 * Draws one rotated, morphed Material shape and its optional circular
 * container. Normalized points are scaled to the specified canvas size.
 *
 * @param context - Device-pixel-ratio-scaled canvas context.
 * @param size - Square CSS size in pixels.
 * @param points - Normalized points describing the current morph.
 * @param rotation - Clockwise rotation in degrees.
 * @param options - Shape color, ratio, and optional container styling.
 * @returns Nothing; the supplied canvas context is repainted in place.
 */
export function drawLoadingIndicator(
  context: CanvasRenderingContext2D,
  size: number,
  points: LoadingIndicatorPoint[],
  rotation: number,
  options: LoadingIndicatorRenderOptions,
) {
  const center = size / 2
  const scale = (size * options.sizeRatio) / 2
  context.clearRect(0, 0, size, size)

  if (options.contained) {
    context.save()
    context.beginPath()
    context.arc(center, center, size / 2, 0, Math.PI * 2)
    context.fillStyle = options.containerColor
    context.fill()
    context.restore()
  }

  context.save()
  context.translate(center, center)
  context.rotate((rotation * Math.PI) / 180)
  context.beginPath()

  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x * scale, y * scale)
    else context.lineTo(x * scale, y * scale)
  })

  context.closePath()
  context.fillStyle = options.color
  context.fill()
  context.restore()
}
