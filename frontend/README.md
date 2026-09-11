# TripFolio Frontend

React, TypeScript, Vite, Tailwind CSS v4, and Lucide icons. React Compiler is enabled.
Components use native HTML elements rather than a runtime UI library.

## Theme

`src/index.css` owns the MD3-inspired theme: semantic colors, Figtree typography,
corner radii, and a small set of elevation and motion tokens. This is an application
theme, not an implementation of Google's component specifications.

The light and dark palettes were generated with Matugen 4.2.0 from
`/home/jdy/Pictures/Wallpapers/sakura-blue.jpg`, using `scheme-tonal-spot`, contrast
`0`, and source-color index `0` (seed `#b4e4e0`). Generation used `--dry-run` with
an isolated config, leaving desktop themes and wallpaper untouched.

- Use paired semantic colors such as `bg-primary text-on-primary` and
  `bg-surface-container text-on-surface`, not hard-coded palette colors.
- System dark mode is handled by `prefers-color-scheme` overrides of the same CSS
  variables. Components do not need separate dark-mode classes or a theme provider.
- Use `text-headline`, `text-title`, `text-body`, and `text-label` for common type
  roles. Standard Tailwind type utilities remain available for smaller supporting text.
- Use `rounded-panel` for panels, `rounded-dock` for floating navigation, and
  `rounded-full` for actions. `shadow-raised` is reserved for floating surfaces.
- Keep layout in Tailwind utilities and reuse React components for repeated structure.
  Native buttons should have an explicit type, visible keyboard focus, and accessible
  names. Gate transitions with `motion-safe:`.

`BottomNav` owns the shared navigation appearance and native button interactions;
parents supply items, selection, and callbacks. It uses Tailwind's standard `sm`
breakpoint (640px), 44px minimum action heights, and safe-area bottom spacing.
The floating dock uses `z-20` to sit above ordinary page content.

## Development

Run commands from `frontend/`:

```sh
npm ci
npm run dev
```

The development server defaults to port 3000.

## Checks

```sh
npm run typecheck
npm run lint:check
npm run test
npm run format:check
npm run build
```

Use `npm run format` to apply Prettier formatting. Unit tests mirror `src/` under
`test/`.

With `npm run dev` running, use `npx cypress run` for navigation regression tests.
Keep Cypress tests focused on business behavior: route changes, trip-section
switching, and returning to the trip collection. Do not assert theme colors,
typography, motion, or layout dimensions. Test data lives in `cypress/fixtures/`.
