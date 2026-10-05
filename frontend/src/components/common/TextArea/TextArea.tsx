import type { TextareaHTMLAttributes } from 'react';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Renders a native textarea with the shared theme and focus treatment.
 * @param props - Native textarea attributes and optional layout classes.
 * @returns A styled multiline text input.
 */
const TextArea = ({ className, ...props }: TextAreaProps) => (
  <textarea
    className={[
      'min-h-12 w-full resize-none rounded-xl border border-outline bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error/25 motion-safe:transition-colors motion-safe:duration-200',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  />
);

export default TextArea;
