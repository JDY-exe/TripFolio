# TripFolio Frontend

React, TypeScript, Vite, Tailwind CSS v4, and Lucide icons. React Compiler is enabled.
Components use native HTML elements rather than a runtime UI library.


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
