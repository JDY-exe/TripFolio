let activeLocks = 0;
let previousOverflow = '';

/**
 * Prevents document scrolling while one or more overlays are visible. The
 * first lock remembers the inline overflow value and the last release restores it.
 *
 * @returns An idempotent function that releases this overlay's scroll lock.
 */
export const lockBodyScroll = () => {
  if (activeLocks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks -= 1;
    if (activeLocks === 0) {
      document.body.style.overflow = previousOverflow;
    }
  };
};
