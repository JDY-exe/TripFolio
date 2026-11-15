import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import Text from '../Text/Text';
import { inputFocusClasses, inputSurfaceClasses } from '../styles/inputStyles';

interface FieldCopy {
  id: string;
  label: string;
  labelAction?: ReactNode;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  leadingIcon?: ReactNode;
  textSize?: 'body' | 'title';
}

export type TextFieldProps = FieldCopy &
  (
    | (Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> & {
        as?: 'input';
      })
    | (Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'size'> & {
        as: 'select';
      })
  );

/**
 * Renders a labeled native input or select with optional supporting or error text.
 * It wires the input's accessible description to status copy and uses semantic
 * tokens for normal, focus, invalid, and disabled states.
 *
 * @param props - Native input attributes plus visible field copy.
 * @param props.label - Visible label associated with the input identifier.
 * @param props.hint - Optional supporting guidance shown below the input.
 * @param props.error - Optional validation message that marks the input invalid.
 * @param props.hideLabel - Visually hides a label when the placeholder and icon make the field clear.
 * @param props.leadingIcon - Decorative icon placed inside the input surface.
 * @param props.textSize - Body text by default, or a larger title treatment for important values.
 * @returns An accessible tokenized text field.
 */
const TextField = ({
  label,
  labelAction,
  hint,
  error,
  hideLabel = false,
  leadingIcon,
  textSize = 'body',
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextFieldProps) => {
  const supportingId = id && (error || hint) ? `${id}-supporting` : undefined;
  const describedBy = [ariaDescribedBy, supportingId].filter(Boolean).join(' ');
  const fieldClassName = [
    inputSurfaceClasses,
    inputFocusClasses,
    'min-h-12 w-full px-4 py-3 placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-50',
    textSize === 'title' ? 'text-title' : 'text-body',
    leadingIcon ? 'pl-11' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="grid gap-2">
      <div
        className={
          hideLabel && !labelAction ? 'sr-only' : 'flex items-center gap-1'
        }
      >
        <Text
          as="label"
          htmlFor={id}
          variant="label"
          color="muted"
          className={hideLabel ? 'sr-only' : undefined}
        >
          {label}
        </Text>
        {labelAction}
      </div>
      <div className="relative min-w-0">
        {!!leadingIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          >
            {leadingIcon}
          </span>
        )}
        {props.as !== 'select' && (
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={fieldClassName}
            {...omitInputAs(props)}
          />
        )}
        {props.as === 'select' && (
          <select
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={fieldClassName}
            {...omitSelectAs(props)}
          />
        )}
      </div>
      {(error || hint) && (
        <Text
          id={supportingId}
          variant="caption"
          color={error ? 'error' : 'muted'}
        >
          {error ?? hint}
        </Text>
      )}
    </div>
  );
};

/** Removes the component discriminator before forwarding native input attributes.
 * @param props - Input branch of the field props.
 * @returns Native input attributes without the component selector.
 */
const omitInputAs = ({
  as: _as,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> & {
  as?: 'input';
}) => {
  void _as;
  return props;
};

/** Removes the component discriminator before forwarding native select attributes.
 * @param props - Select branch of the field props.
 * @returns Native select attributes without the component selector.
 */
const omitSelectAs = ({
  as: _as,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'size'> & {
  as: 'select';
}) => {
  void _as;
  return props;
};

export default TextField;
