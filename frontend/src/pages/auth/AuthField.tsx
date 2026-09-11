interface AuthFieldProps {
  id: string
  label: string
  type: 'text' | 'email' | 'password'
  autoComplete: string
}

/**
 * Renders a labeled native input with shared authentication form styling.
 * The browser handles input editing and autofill without application state.
 *
 * @param props - Field identity, visible label, input type, and autofill hint.
 * @returns An accessible input and its associated label.
 */
function AuthField({ id, label, type, autoComplete }: AuthFieldProps) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-label text-on-surface">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        className="min-h-12 w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 motion-safe:transition-colors motion-safe:duration-200"
      />
    </div>
  )
}

export default AuthField
