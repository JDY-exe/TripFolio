import { useEffect, useRef, useState } from 'react';
import type { TripTraveler } from '../../../queries/trips';

/** Fits whole recipient labels into the preview, reserving space for the overflow button.
 * @param recipientIds - Ordered IDs; changes cause the offscreen labels to be measured again.
 * @param travelers - Member data whose usernames and photos can change measured label widths.
 * @returns Preview and measurement refs plus the number of recipients that fit.
 */
export const useRecipientPreview = (
  recipientIds: readonly string[],
  travelers: readonly TripTraveler[],
) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const preview = previewRef.current;
    const measure = measureRef.current;
    if (!preview || !measure) return;
    let active = true;

    /** Measures the same person components used on screen, including gaps and button width.
     * @returns Nothing; updates the count only while this measurement subscription is active.
     */
    const measureRecipients = () => {
      if (!active) return;
      const people = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-recipient-measure]'),
      );
      const control = measure.querySelector<HTMLButtonElement>('button');
      const gap = parseFloat(getComputedStyle(preview).columnGap) || 0;
      const available = preview.clientWidth;
      const widths = people.map(
        (person) => person.getBoundingClientRect().width,
      );
      const fullWidth =
        widths.reduce((sum, width) => sum + width, 0) +
        Math.max(0, widths.length - 1) * gap;
      if (fullWidth <= available) {
        setVisibleCount(widths.length);
        return;
      }
      const controlWidth = control?.getBoundingClientRect().width ?? 0;
      let used = controlWidth;
      let count = 0;
      for (const width of widths) {
        const next = used + gap + width;
        if (next > available) break;
        used = next;
        count++;
      }
      setVisibleCount(count);
    };

    const observer = new ResizeObserver(measureRecipients);
    observer.observe(preview);
    observer.observe(measure);
    void document.fonts.ready.then(measureRecipients);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [recipientIds, travelers]);

  return {
    previewRef,
    measureRef,
    visibleCount: Math.min(visibleCount, recipientIds.length),
  };
};
