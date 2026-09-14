const chapters = [
  { number: '01', title: 'Flights', href: '#logistics-flights' },
  { number: '02', title: 'Rental cars', href: '#logistics-cars' },
  { number: '03', title: 'Accommodations', href: '#logistics-stays' },
];

/**
 * Links to logistics chapters using native document anchors.
 * The outline stays on the right on desktop and becomes a scrollable row on mobile.
 *
 * @returns A responsive chapter navigation landmark without scroll-tracking logic.
 */
function LogisticsChapterNav() {
  return (
    <nav
      aria-label="Logistics chapters"
      className="min-w-0 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1"
    >
      <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-2 lg:overflow-visible lg:border-l lg:border-outline-variant lg:pb-0 lg:pl-3">
        {chapters.map((chapter) => (
          <li key={chapter.href} className="shrink-0">
            <a
              href={chapter.href}
              className="flex min-h-12 items-center gap-3 rounded-[0.5rem_1.5rem_1.5rem_0.5rem] px-3 py-3 text-label text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors motion-safe:duration-200"
            >
              <span aria-hidden="true" className="text-xs tabular-nums">
                {chapter.number}
              </span>
              {chapter.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default LogisticsChapterNav;
