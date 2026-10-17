import { useEffect, useState, type RefObject } from 'react';

/** Tracks the day occupying a reading line one third down the viewport.
 * @param container - The itinerary column, excluding the sticky sidebar.
 * @param firstDate - Default day before any section crosses the reading line.
 * @returns The visible day's UTC date key.
 */
export const useActiveItineraryDay = (
  container: RefObject<HTMLElement | null>,
  firstDate?: string,
) => {
  const [activeDate, setActiveDate] = useState(firstDate);
  useEffect(() => {
    let frame = 0;
    /** Measures day boundaries once per frame, retaining long days until the next heading. */
    const measure = () => {
      const sections = container.current?.querySelectorAll<HTMLElement>(
        '[data-itinerary-date]',
      );
      let date = firstDate;
      sections?.forEach((section) => {
        if (section.getBoundingClientRect().top <= window.innerHeight / 3) {
          date = section.dataset.itineraryDate;
        }
      });
      setActiveDate(date);
    };
    /** Coalesces scroll and resize events into a single geometry measurement. */
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    if (container.current) observer.observe(container.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [container, firstDate]);
  return activeDate ?? firstDate;
};
