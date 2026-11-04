import { useId } from 'react';
import { Text } from '../../../components/common';

/** Introduces an empty album with photographic keepsakes in the trip-cover illustration style.
 * @returns A small theme-aware landscape illustration and guidance for adding trip memories.
 */
const AlbumEmptyState = () => {
  const landscapeId = useId();

  return (
    <div
      className="flex h-full min-h-80 flex-col items-center justify-center px-6 py-12 text-center"
      data-cy="album-empty-state"
    >
      <svg
        aria-hidden="true"
        className="mb-6 w-48 max-w-full"
        viewBox="0 0 240 170"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={landscapeId}>
            <rect x="54" y="33" width="136" height="94" rx="2" />
          </clipPath>
        </defs>
        <path
          d="M20 130c28 18 46-11 63-6m93-103c18-10 35-5 46 7"
          fill="none"
          stroke="var(--color-outline-variant)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 7"
        />
        <g transform="rotate(-10 115 88)">
          <rect
            x="36"
            y="22"
            width="151"
            height="125"
            rx="4"
            fill="var(--color-secondary-container)"
            stroke="var(--color-outline-variant)"
          />
        </g>
        <g transform="rotate(6 122 87)">
          <rect
            x="46"
            y="25"
            width="152"
            height="126"
            rx="4"
            fill="var(--color-surface-container-low)"
            stroke="var(--color-outline-variant)"
          />
          <g clipPath={`url(#${landscapeId})`}>
            <rect
              x="54"
              y="33"
              width="136"
              height="94"
              fill="var(--color-primary-container)"
            />
            <circle
              cx="156"
              cy="56"
              r="16"
              fill="var(--color-surface)"
              fillOpacity="0.8"
            />
            <path
              d="M44 102c30-39 50-37 77-14 26 22 45-32 79-12v61H44Z"
              fill="var(--color-secondary)"
              fillOpacity="0.4"
            />
            <path
              d="M44 127c30-28 51-29 73-8 28 25 48-25 83-15v34H44Z"
              fill="var(--color-primary)"
              fillOpacity="0.8"
            />
            <path
              d="M82 125c3-14 31-9 36-22 4-9-7-11-3-20"
              fill="none"
              stroke="var(--color-surface)"
              strokeOpacity="0.8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="2 5"
            />
          </g>
        </g>
      </svg>
      <Text as="h3" variant="headline">
        No photos yet
      </Text>
      <Text color="muted" className="mt-3 max-w-sm">
        Add photos from your trip to revisit the moments you captured. Photos
        with location data will appear on the map.
      </Text>
    </div>
  );
};

export default AlbumEmptyState;
