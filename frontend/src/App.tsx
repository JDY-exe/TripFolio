import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import { ToastViewport } from './components/common';
import ScreenLoadingOverlay from './components/common/LoadingIndicator/ScreenLoadingOverlay';
import BottomNav from './components/navigation/BottomNav';
import {
  getTopLevelNavValue,
  topLevelNavItems,
} from './components/navigation/navigationConfig';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './pages/auth/Auth';
import MyTrips from './pages/my-trips/MyTrips';
import Profile from './pages/profile/Profile';
import Search from './pages/search/Search';
import PublicItinerary from './pages/social/PublicItinerary';
import SocialFeed from './pages/social/SocialFeed';
import Trip from './pages/trip/Trip';
import { AuthStatus } from './types/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Renders the route tree and the primary application navigation.
 *
 * Keeping this component beneath BrowserRouter allows it to derive selection
 * from the current URL and hide the primary nav for auth and selected-trip pages.
 *
 * @returns The application routes and, when appropriate, the primary bottom nav.
 */
const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useLoading();
  const { status } = useAuth();
  const showPrimaryNav =
    status === AuthStatus.Authenticated &&
    location.pathname !== '/auth' &&
    !location.pathname.startsWith('/trip') &&
    !location.pathname.startsWith('/public-itinerary');

  return (
    <div
      aria-hidden={isLoading || undefined}
      className="min-h-screen bg-surface text-on-surface"
      inert={isLoading || undefined}
    >
      <main className="mx-auto max-w-6xl px-6 pt-8 pb-28">
        <Routes>
          <Route path="auth" element={<Auth />} />
          <Route element={<RequireAuth />}>
            <Route index element={<Navigate to="/my-trips" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="social" element={<SocialFeed />} />
            <Route
              path="public-itinerary/:tripId"
              element={<PublicItinerary />}
            />
            <Route path="search" element={<Search />} />
            <Route path="my-trips" element={<MyTrips />} />
            <Route path="trip" element={<Trip />} />
            <Route path="trip/:id" element={<Trip />} />
            <Route path="*" element={<Navigate to="/my-trips" replace />} />
          </Route>
        </Routes>
      </main>

      {showPrimaryNav ? (
        <BottomNav
          label="Main navigation"
          items={topLevelNavItems}
          value={getTopLevelNavValue(location.pathname)}
          onChange={navigate}
        />
      ) : null}

      <ToastViewport />
    </div>
  );
};

/**
 * Restricts nested routes to authenticated users. The complete internal URL is
 * carried to the auth page so a successful login can resume the interrupted view.
 *
 * @returns Nested protected routes, a login redirect, or no content while auth loads.
 */
const RequireAuth = () => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === AuthStatus.Checking) return null;

  if (status === AuthStatus.Anonymous) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/auth" replace state={{ from }} />;
  }

  return <Outlet />;
};

/**
 * Defines the client-side routes for TripFolio.
 *
 * The router renders the application shell and sends unknown locations to the
 * trips page so visitors always reach usable content.
 *
 * @returns The configured TripFolio application router.
 */
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
            <ScreenLoadingOverlay />
          </AuthProvider>
        </BrowserRouter>
      </LoadingProvider>
    </QueryClientProvider>
  );
};

export default App;
