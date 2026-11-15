/** Shared filled input surfaces and accessible focus/error treatment, without idle borders. */
export const inputSurfaceClasses =
  'rounded-xl border-0 bg-surface-container-low text-on-surface motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-standard';

export const inputFocusClasses =
  'outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-invalid:ring-2 aria-invalid:ring-error/60 aria-invalid:focus-visible:ring-error/60';
