import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import Text from '../Text/Text';

interface FieldCopy {
  id: string;
  label: string;
  labelAction?: ReactNode;
  hint?: string;
  error?: string;
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
 * @returns An accessible tokenized text field.
 */
const TextField = ({
  label,
  labelAction,
  hint,
  error,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextFieldProps) => {
  const supportingId = id && (error || hint) ? `${id}-supporting` : undefined;
  const describedBy = [ariaDescribedBy, supportingId].filter(Boolean).join(' ');
  const fieldClassName = [
    'min-h-12 w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error/25 motion-safe:transition-colors motion-safe:duration-200',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1">
        <Text as="label" htmlFor={id} variant="label">
          {label}
        </Text>
        {labelAction}
      </div>
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
