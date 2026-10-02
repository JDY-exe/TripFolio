import type { TextareaHTMLAttributes } from 'react';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Renders a native textarea with the shared theme and focus treatment.
 * @param props - Native textarea attributes and optional layout classes.
 * @returns A styled multiline text input.
 */
const TextArea = ({ className, ...props }: TextAreaProps) => (
  <textarea
    className={[
      'w-full resize-none rounded border border-outline bg-surface-container p-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-200',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  />
);

export default TextArea;
