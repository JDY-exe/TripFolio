export interface SkeletonProps {
  className: string;
}

/**
 * Renders a decorative placeholder for content that is still loading.
 * @param props - Dimensions and shape classes.
 * @returns A pulsing surface hidden from assistive technology.
 */
const Skeleton = ({ className }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={[
      'rounded-lg bg-surface-container-high motion-safe:animate-pulse',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  />
);

export default Skeleton;
