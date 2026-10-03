import { ArrowRight } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type SubmitEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button, displayAlert, Text, TextField } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useLoading } from '../../contexts/LoadingContext';
import { AuthStatus } from '../../types/auth';
import { getApiErrorMessage } from '../../utils/api';
import AuthArtwork from './AuthArtwork';
import Onboard from './Onboard';

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
const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login, register, updateProfilePicture } = useAuth();
  const { setLoading } = useLoading();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const { height: formHeight, loginRef, signupRef } = useAuthFormHeight(mode);

  /**
   * Authenticates the entered credentials and resumes the route that originally
   * sent the visitor to the auth page.
   *
   * @param event - Native login form submission event.
   * @returns Nothing.
   */
  const handleLogin = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      displayAlert({
        title: 'Unable to log in',
        message: 'Enter your email and password.',
        tone: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      displayAlert({ message: 'Welcome back.', tone: 'success' });
      navigate(getReturnPath(location.state), { replace: true });
    } catch (error) {
      displayAlert({
        title: 'Unable to log in',
        message: getApiErrorMessage(
          error,
          'Check your credentials and try again.',
        ),
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Creates an authenticated account after validating password confirmation,
   * then moves the new user into profile-picture onboarding.
   *
   * @param event - Native signup form submission event.
   * @returns Nothing.
   */
  const handleSignup = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const user = String(formData.get('user') ?? '');
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const passwordAgain = String(formData.get('passwordAgain') ?? '');

    if (password !== passwordAgain) {
      displayAlert({
        title: 'Passwords do not match',
        message: 'Enter the same password in both fields.',
        tone: 'error',
      });
      return;
    }

    if (!user || !email || !password) {
      displayAlert({
        title: 'Unable to sign up',
        message: 'Enter a username, email, and password.',
        tone: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await register(user, email, password);
      displayAlert({ message: 'Your account is ready.', tone: 'success' });
      setIsOnboarding(true);
    } catch (error) {
      displayAlert({
        title: 'Unable to sign up',
        message: getApiErrorMessage(
          error,
          'Your account could not be created. Try again.',
        ),
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Persists the prepared onboarding picture, when supplied, then enters the
   * trip collection and confirms the completed account setup.
   *
   * @param picture - Center-cropped image data, or undefined when skipped.
   * @returns A promise resolving after persistence and navigation complete.
   */
  const handleOnboardingComplete = async (picture?: string) => {
    try {
      if (picture) await updateProfilePicture(picture);
      displayAlert({
        message: picture
          ? 'Profile picture saved.'
          : 'Using the default profile picture.',
        tone: 'success',
      });
      navigate('/my-trips');
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Your profile picture could not be saved. Try again.',
      );
      displayAlert({
        title: 'Unable to finish setup',
        message,
        tone: 'error',
      });
      throw new Error(message, { cause: error });
    }
  };

  if (isOnboarding) {
    return <Onboard onComplete={handleOnboardingComplete} />;
  }

  if (status === AuthStatus.Authenticated) {
    return <Navigate to={getReturnPath(location.state)} replace />;
  }

  return (
    <section className="group/auth mx-auto grid max-w-5xl items-start gap-12 text-on-surface lg:grid-cols-2 lg:gap-20">
      <AuthArtwork />

      <div className="group mx-auto w-full max-w-sm py-4 sm:py-8">
        <Text as="h1" variant="display">
          Your <span className="text-primary">account</span>
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

        <div
          className="relative overflow-hidden motion-safe:transition-[height] motion-safe:duration-500 motion-safe:ease-standard"
          style={{ height: formHeight }}
        >
          <form
            ref={loginRef}
            id="login-form"
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
};

/**
 * Resolves a safe internal route from React Router state. Only root-relative
 * paths are accepted so authentication cannot become an open redirect.
 *
 * @param state - Unknown navigation state supplied to the auth route.
 * @returns The preserved internal destination or the default trips route.
 */
const getReturnPath = (state: unknown): string => {
  if (!state || typeof state !== 'object' || !('from' in state)) {
    return '/my-trips';
  }

  const from = state.from;
  return typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//')
    ? from
    : '/my-trips';
};

/**
 * Measures the active auth form so its shared viewport can animate to fit it.
 * Both forms remain anchored at the same top position while a ResizeObserver
 * updates the target height when responsive content or fonts change its size.
 *
 * @param mode - Authentication form currently selected by the visitor.
 * @returns Form refs and the measured height of the active form.
 */
const useAuthFormHeight = (mode: AuthMode) => {
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
};

export default Auth;
