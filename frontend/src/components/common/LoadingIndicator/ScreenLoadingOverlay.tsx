import { useEffect, useRef } from 'react';
import { useLoading } from '../../../contexts/LoadingContext';
import { lockBodyScroll } from '../scrollLock';
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
    const releaseScrollLock = lockBodyScroll();
    overlayRef.current?.focus();

    return () => {
      releaseScrollLock();
      previouslyFocused?.focus();
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div
      ref={overlayRef}
      aria-modal="true"
      className="fixed inset-0 z-100 flex items-center justify-center bg-surface/80 text-primary backdrop-blur-sm focus:outline-none"
      role="dialog"
      tabIndex={-1}
    >
      <span className="sr-only">Loading</span>
      <LoadingIndicator size={128} />
    </div>
  );
}

export default ScreenLoadingOverlay;
