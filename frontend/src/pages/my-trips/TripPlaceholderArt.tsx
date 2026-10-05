import { useId } from 'react';

/** Fills a trip cover with a decorative route and layered landscape.
 * @returns A theme-aware SVG thumbnail for trips without a cover image.
 */
const TripPlaceholderArt = () => {
  const skyId = useId();
  const hillId = useId();

  return (
    <svg
      aria-hidden="true"
      className="aspect-video w-full"
      viewBox="0 0 800 450"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={skyId} x2="1" y2="1">
          <stop stopColor="var(--color-primary-container)" />
          <stop offset="1" stopColor="var(--color-secondary-container)" />
        </linearGradient>
        <linearGradient id={hillId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--color-primary)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>

      <rect width="800" height="450" fill={`url(#${skyId})`} />
      <circle
        cx="602"
        cy="135"
        r="92"
        fill="var(--color-surface)"
        fillOpacity="0.6"
      />
      <circle
        cx="602"
        cy="135"
        r="115"
        fill="none"
        stroke="var(--color-on-primary-container)"
        strokeOpacity="0.14"
        strokeWidth="2"
      />
      <path
        d="M-40 117c114-77 233-75 339-26 84 39 157 44 252 4M-62 159c124-81 232-79 348-26 91 42 169 43 270-1M465 35c107-48 211-35 326 34"
        fill="none"
        stroke="var(--color-on-primary-container)"
        strokeOpacity="0.16"
        strokeWidth="2"
      />

      <path
        d="M0 301c94-76 171-87 269-35 84 44 157 31 237-34 104-85 188-73 294 6v212H0Z"
        fill="var(--color-surface)"
        fillOpacity="0.4"
      />
      <path
        d="M0 361c100-61 166-53 255-2 88 50 162 21 244-47 103-87 205-80 301-7v145H0Z"
        fill="var(--color-secondary)"
        fillOpacity="0.4"
      />
      <path
        d="M0 420c93-80 182-77 271-17 91 61 158 56 255-19 91-70 179-59 274-12v78H0Z"
        fill={`url(#${hillId})`}
      />

      <path
        d="M132 352c82-7 108-98 203-91 82 6 98 64 175 36 54-19 71-83 130-95"
        fill="none"
        stroke="var(--color-on-primary-container)"
        strokeOpacity="0.75"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 16"
      />
      <circle
        cx="132"
        cy="352"
        r="10"
        fill="var(--color-surface)"
        stroke="var(--color-primary)"
        strokeWidth="4"
      />
      <path
        d="M640 174c-19 0-34 15-34 34 0 25 34 58 34 58s34-33 34-58c0-19-15-34-34-34Z"
        fill="var(--color-primary)"
      />
      <circle cx="640" cy="208" r="11" fill="var(--color-on-primary)" />
    </svg>
  );
};

export default TripPlaceholderArt;
