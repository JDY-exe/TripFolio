import { Text } from '../../components/common';

/** Renders a minimal landscape and guidance when there are no trips.
 * @returns A theme-aware SVG empty state.
 */
const EmptyTrips = () => (
  <div
    data-cy="empty-trips"
    className="col-span-full flex min-h-[55vh] flex-col items-center justify-center text-center"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 320 220"
      className="mb-6 w-64 max-w-full text-primary"
      fill="none"
    >
      <circle cx="215" cy="65" r="32" fill="currentColor" opacity=".12" />
      <path
        d="M30 175 105 65l55 80 40-55 90 85m-204-82 19 9 18-10m60 21 17 9 18-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".5"
      />
      <path
        d="M55 189c65-48 94 35 149-9s53-34 67-29"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 8"
      />
      <circle cx="55" cy="189" r="4" fill="currentColor" />
      <path
        d="M270 128c-9 0-15 7-15 15 0 11 15 24 15 24s15-13 15-24c0-8-6-15-15-15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="270" cy="143" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
    <Text color="muted" className="mt-3 mb-6">
      No trips found. Create one to get started!
    </Text>
  </div>
);
export default EmptyTrips;
