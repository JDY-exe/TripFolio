import { NavLink } from 'react-router';

/**
 * Displays the shared TripFolio brand header.
 *
 * The brand links to the user's trip collection so every page has a consistent
 * route back to the primary application content.
 *
 * @returns The application header.
 */
function AppHeader() {
  return (
    <header className="bg-surface-container-low text-on-surface">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-5">
        <NavLink to="/my-trips" className="text-title tracking-tight">
          TripFolio
        </NavLink>
      </div>
    </header>
  );
}

export default AppHeader;
