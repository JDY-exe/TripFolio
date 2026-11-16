import type { TextareaHTMLAttributes } from 'react';
import { inputFocusClasses, inputSurfaceClasses } from '../styles/inputStyles';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Renders a native textarea with the shared theme and focus treatment.
 * @param props - Native textarea attributes and optional layout classes.
 * @returns A styled multiline text input.
 */
const TextArea = ({ className, ...props }: TextAreaProps) => (
  <textarea
    className={[
      inputSurfaceClasses,
      inputFocusClasses,
      'min-h-12 w-full resize-none px-4 py-3 text-body placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-50',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  />
);

export default TextArea;
