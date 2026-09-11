import { ArrowRight } from 'lucide-react'
import AuthField from './AuthField'

const modeClasses =
  'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-label text-on-surface-variant has-checked:bg-secondary-container has-checked:text-on-secondary-container has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary motion-safe:transition-colors motion-safe:duration-200'

const submitClasses =
  'mt-2 inline-flex min-h-12 w-full items-center justify-between rounded-full bg-primary px-6 py-3 text-label text-on-primary'

/**
 * Presents login and signup mockups beside a decorative travel photograph.
 * Native radios and CSS switch the visible form without React state; submit
 * buttons remain disabled until authentication is implemented.
 *
 * @returns A responsive, presentation-only authentication page.
 */
function Auth() {
  return (
    <section className="mx-auto grid max-w-5xl items-center gap-12 text-on-surface lg:grid-cols-2 lg:gap-20">
      <div className="hidden overflow-hidden rounded-panel bg-surface-container lg:block">
        <img
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80"
          alt=""
          width={1000}
          height={1400}
          className="aspect-[5/7] w-full object-cover"
        />
      </div>

      <div className="group mx-auto w-full max-w-sm py-4 sm:py-8">
        <h1 className="text-headline tracking-tight">Your account</h1>

        <fieldset className="mb-8 mt-6 flex gap-1 rounded-full bg-surface-container p-1">
          <legend className="sr-only">Account access</legend>
          <label className={modeClasses}>
            <input
              id="auth-login"
              type="radio"
              name="auth-mode"
              value="login"
              defaultChecked
              aria-controls="login-form"
              className="sr-only"
            />
            Log in
          </label>
          <label className={modeClasses}>
            <input
              id="auth-signup"
              type="radio"
              name="auth-mode"
              value="signup"
              aria-controls="signup-form"
              className="sr-only"
            />
            Sign up
          </label>
        </fieldset>

        {/* TODO: Connect authentication and validation before enabling submission. */}
        <form
          id="login-form"
          aria-label="Log in"
          className="hidden space-y-5 group-has-[#auth-login:checked]:block"
        >
          <AuthField
            id="login-email"
            label="Email"
            type="email"
            autoComplete="username"
          />
          <AuthField
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />
          <button type="submit" disabled className={submitClasses}>
            Log in
            <ArrowRight aria-hidden size={18} />
          </button>
        </form>

        <form
          id="signup-form"
          aria-label="Sign up"
          className="hidden space-y-5 group-has-[#auth-signup:checked]:block"
        >
          <AuthField
            id="signup-name"
            label="Name"
            type="text"
            autoComplete="name"
          />
          <AuthField
            id="signup-email"
            label="Email"
            type="email"
            autoComplete="username"
          />
          <AuthField
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
          />
          <button type="submit" disabled className={submitClasses}>
            Create account
            <ArrowRight aria-hidden size={18} />
          </button>
        </form>
      </div>
    </section>
  )
}

export default Auth
