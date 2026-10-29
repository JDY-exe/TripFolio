import { Skeleton } from '../../../components/common';

interface LogisticsSkeletonCardProps {
  label: string;
  className?: string;
}

/**
 * Reserves a card-sized area while one logistics category loads.
 * @param props - Accessible loading label and the category's card shape.
 * @returns A decorative card skeleton with a screen-reader status.
 */
const LogisticsSkeletonCard = ({
  label,
  className,
}: LogisticsSkeletonCardProps) => (
  <div
    role="status"
    aria-label={label}
    className={[
      'min-h-60 bg-surface-container-low p-5 sm:p-6',
      className ?? 'rounded-panel',
    ].join(' ')}
  >
    <div className="flex items-center gap-4">
      <Skeleton className="size-14 shrink-0 rounded-2xl" />
      <div className="grid w-full max-w-64 gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="mt-8 flex items-start justify-between gap-6">
      <div className="grid w-2/5 gap-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="grid w-2/5 justify-items-end gap-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
    <div className="mt-8 flex justify-between gap-6 border-t border-outline-variant pt-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  </div>
);

export default LogisticsSkeletonCard;
