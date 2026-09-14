import { useEffect, useRef } from 'react';
import { useLoading } from '../../../contexts/LoadingContext';
import LoadingIndicator from './LoadingIndicator';

/**
 * Blocks the viewport with an accessible modal loading state. It moves focus
 * into the overlay and locks body scrolling until the operation completes.
 *
 * @returns A full-screen modal containing the expressive loading indicator.
 */
function ScreenLoadingOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useLoading();

  useEffect(() => {
    if (!isLoading) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    overlayRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div
      ref={overlayRef}
      aria-label="Loading"
      aria-modal="true"
      className="fixed inset-0 z-100 flex items-center justify-center bg-surface/80 text-primary backdrop-blur-sm focus:outline-none"
      role="dialog"
      tabIndex={-1}
    >
      <LoadingIndicator size={128} />
    </div>
  );
}

export default ScreenLoadingOverlay;
