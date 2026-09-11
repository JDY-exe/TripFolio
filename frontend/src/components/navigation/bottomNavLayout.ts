/**
 * Calculates the flex-grow weight needed for one item to reach a requested
 * width multiplier while its equal-width siblings absorb the lost space.
 *
 * The calculation keeps the row width fixed and assigns every sibling a
 * weight of one, producing an exact proportional expansion for the target.
 *
 * @param itemCount - Number of equally sized items sharing the navigation row.
 * @param widthMultiplier - Requested target width relative to its resting width.
 * @returns The target item's flex-grow weight, or one when expansion is invalid.
 */
export function getExpandedFlexGrow(
  itemCount: number,
  widthMultiplier: number,
): number {
  if (itemCount <= 1 || widthMultiplier <= 1 || widthMultiplier >= itemCount) {
    return 1
  }

  return (widthMultiplier * (itemCount - 1)) / (itemCount - widthMultiplier)
}
