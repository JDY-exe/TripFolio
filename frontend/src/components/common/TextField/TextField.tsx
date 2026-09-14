import type { InputHTMLAttributes } from 'react'
import Text from '../Text/Text'

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'size'
> {
  id: string
  label: string
  hint?: string
  error?: string
}

/**
 * Renders a labeled native input with optional supporting or error text.
 * It wires the input's accessible description to status copy and uses semantic
 * tokens for normal, focus, invalid, and disabled states.
 *
 * @param props - Native input attributes plus visible field copy.
 * @param props.label - Visible label associated with the input identifier.
 * @param props.hint - Optional supporting guidance shown below the input.
 * @param props.error - Optional validation message that marks the input invalid.
 * @returns An accessible tokenized text field.
 */
function TextField({
  label,
  hint,
  error,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextFieldProps) {
  const supportingId = id && (error || hint) ? `${id}-supporting` : undefined
  const describedBy = [ariaDescribedBy, supportingId].filter(Boolean).join(' ')

  return (
    <div className="grid gap-2">
      <Text as="label" htmlFor={id} variant="label">
        {label}
      </Text>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={[
          'min-h-12 w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error/25 motion-safe:transition-colors motion-safe:duration-200',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error || hint ? (
        <Text
          id={supportingId}
          variant="caption"
          color={error ? 'error' : 'muted'}
        >
          {error ?? hint}
        </Text>
      ) : null}
    </div>
  )
}

export default TextField
