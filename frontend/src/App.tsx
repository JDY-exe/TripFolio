import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import AppHeader from './components/AppHeader';
import { ToastViewport } from './components/common';
import ScreenLoadingOverlay from './components/common/LoadingIndicator/ScreenLoadingOverlay';
import BottomNav from './components/navigation/BottomNav';
import {
  getTopLevelNavValue,
  topLevelNavItems,
} from './components/navigation/navigationConfig';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import Auth from './pages/auth/Auth';
import MyTrips from './pages/my-trips/MyTrips';
import Profile from './pages/profile/Profile';
import Search from './pages/search/Search';
import Trip from './pages/trip/Trip';
import CreateTrip from './pages/my-trips/CreateTrip';

/**
 * Renders the route tree and the primary application navigation.
 *
 * Keeping this component beneath BrowserRouter allows it to derive selection
 * from the current URL and hide the primary nav for auth and selected-trip pages.
 *
 * @returns The application routes and, when appropriate, the primary bottom nav.
 */
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useLoading();
  const showPrimaryNav =
    location.pathname !== '/auth' && location.pathname !== '/trip';

  return (
    <div
      aria-hidden={isLoading || undefined}
      className="min-h-screen bg-surface text-on-surface"
      inert={isLoading || undefined}
    >
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-12 pb-28">
        <Routes>
          <Route index element={<Navigate to="/my-trips" replace />} />
          <Route path="auth" element={<Auth />} />
          <Route path="profile" element={<Profile />} />
          <Route path="search" element={<Search />} />
          <Route path="my-trips" element={<MyTrips />} />
          <Route path="trip" element={<Trip />} />
          <Route path="*" element={<Navigate to="/my-trips" replace />} />
          <Route path="/create-trip" element={<CreateTrip />} />
        </Routes>
      </main>

      {showPrimaryNav ? (
        <BottomNav
          aria-label="Main navigation"
          items={topLevelNavItems}
          value={getTopLevelNavValue(location.pathname)}
          onChange={navigate}
        />
      ) : null}

      <ToastViewport />
    </div>
  );
}

/**
 * Defines the client-side routes for TripFolio.
 *
 * The router renders the application shell and sends unknown locations to the
 * trips page so visitors always reach usable content.
 *
 * @returns The configured TripFolio application router.
 */
function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <AppContent />
        <ScreenLoadingOverlay />
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
