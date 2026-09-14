import { ArrowRight } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, displayAlert, Text, TextField } from '../../components/common';
import { useLoading } from '../../contexts/LoadingContext';
import AuthArtwork from './AuthArtwork';

type AuthMode = 'login' | 'signup';

const modeClasses =
  'flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-label text-on-surface-variant has-checked:bg-secondary-container has-checked:text-on-secondary-container has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary motion-safe:transition-colors motion-safe:duration-200';

/**
 * Presents login and signup mockups beside a decorative travel photograph.
 * Controlled native radios identify the active form while a measured viewport
 * animates additional signup fields downward from a stable top edge.
 *
 * @returns A responsive, presentation-only authentication page.
 */
function Auth() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  const [mode, setMode] = useState<AuthMode>('login');
  const { height: formHeight, loginRef, signupRef } = useAuthFormHeight(mode);

  /**
   * Submits the temporary login fixture and reports the result globally.
   * Native FormData reads the uncontrolled fields before successful credentials
   * move the visitor into their trip collection.
   *
   * @param event - Native login form submission event.
   * @returns Nothing.
   */
  async function handleLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    // TODO: Replace mock credential checks with the authentication API.
    if (email !== 'email' || password !== 'pass') {
      displayAlert({
        title: 'Unable to log in',
        message: 'Use “email” and “pass” for the mock account.',
        tone: 'error',
      });
      return;
    }
    setLoading(true);
    // TODO: Remove the delay and replace with actual login API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    displayAlert({ message: 'Welcome back.', tone: 'success' });
    setLoading(false);
    navigate('/my-trips');
  }

  /**
   * Submits the temporary signup fixture and reports validation failures.
   * It checks password confirmation before accepting the fixed mock values and
   * moving the new visitor into their trip collection.
   *
   * @param event - Native signup form submission event.
   * @returns Nothing.
   */
  async function handleSignup(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const user = String(formData.get('user') ?? '');
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const passwordAgain = String(formData.get('passwordAgain') ?? '');

    // TODO: Replace mock account creation with the authentication API.
    if (password !== passwordAgain) {
      displayAlert({
        title: 'Passwords do not match',
        message: 'Enter the same password in both fields.',
        tone: 'error',
      });
      return;
    }

    if (user !== 'user' || email !== 'email' || password !== 'pass') {
      displayAlert({
        title: 'Unable to sign up',
        message: 'Use “user”, “email”, and “pass” for the mock account.',
        tone: 'error',
      });
      return;
    }
    setLoading(true);
    // TODO: Remove the delay and replace with actual login API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    displayAlert({ message: 'Your account is ready.', tone: 'success' });
    setLoading(false);
    navigate('/my-trips');
  }

  return (
    <section className="group/auth mx-auto grid max-w-5xl items-start gap-12 text-on-surface lg:grid-cols-2 lg:gap-20">
      <AuthArtwork />

      <div className="group mx-auto w-full max-w-sm py-4 sm:py-8">
        <Text as="h1" variant="headline">
          Your account
        </Text>

        <fieldset className="mb-8 mt-6 flex gap-1 rounded-full bg-surface-container p-1">
          <legend className="sr-only">Account access</legend>
          <label className={modeClasses}>
            <input
              id="auth-login"
              type="radio"
              name="auth-mode"
              value="login"
              checked={mode === 'login'}
              onChange={() => setMode('login')}
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
              checked={mode === 'signup'}
              onChange={() => setMode('signup')}
              aria-controls="signup-form"
              className="sr-only"
            />
            Sign up
          </label>
        </fieldset>

        {/* TODO: Connect authentication and validation before enabling submission. */}
        <div
          className="relative overflow-hidden motion-safe:transition-[height] motion-safe:duration-500 motion-safe:ease-standard"
          style={{ height: formHeight }}
        >
          <form
            ref={loginRef}
            id="login-form"
            aria-label="Log in"
            onSubmit={handleLogin}
            noValidate
            aria-hidden={mode !== 'login'}
            inert={mode !== 'login'}
            className={`absolute inset-x-0 top-0 space-y-5 motion-safe:transition-opacity motion-safe:duration-300 ${mode === 'login' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <TextField
              id="login-email"
              name="email"
              label="Email"
              type="email"
              autoComplete="username"
            />
            <TextField
              id="login-password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              size="lg"
              fullWidth
              className="mt-2 justify-between"
              trailingIcon={<ArrowRight aria-hidden size={18} />}
            >
              Log in
            </Button>
          </form>

          <form
            ref={signupRef}
            id="signup-form"
            aria-label="Sign up"
            onSubmit={handleSignup}
            noValidate
            aria-hidden={mode !== 'signup'}
            inert={mode !== 'signup'}
            className={`absolute inset-x-0 top-0 space-y-5 motion-safe:transition-opacity motion-safe:duration-300 ${mode === 'signup' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <TextField
              id="signup-name"
              name="user"
              label="User Name"
              type="text"
              autoComplete="name"
            />
            <TextField
              id="signup-email"
              name="email"
              label="Email"
              type="email"
              autoComplete="username"
            />
            <TextField
              id="signup-password"
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
            />
            <TextField
              id="signup-password-again"
              name="passwordAgain"
              label="Password again"
              type="password"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              size="lg"
              fullWidth
              className="mt-2 justify-between"
              trailingIcon={<ArrowRight aria-hidden size={18} />}
            >
              Create account
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

/**
 * Measures the active auth form so its shared viewport can animate to fit it.
 * Both forms remain anchored at the same top position while a ResizeObserver
 * updates the target height when responsive content or fonts change its size.
 *
 * @param mode - Authentication form currently selected by the visitor.
 * @returns Form refs and the measured height of the active form.
 */
function useAuthFormHeight(mode: AuthMode) {
  const loginRef = useRef<HTMLFormElement>(null);
  const signupRef = useRef<HTMLFormElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const activeForm = mode === 'login' ? loginRef.current : signupRef.current;
    if (!activeForm) return;

    const updateHeight = () => setHeight(activeForm.scrollHeight);
    const observer = new ResizeObserver(updateHeight);
    updateHeight();
    observer.observe(activeForm);

    return () => observer.disconnect();
  }, [mode]);

  return { height, loginRef, signupRef };
}

export default Auth;
