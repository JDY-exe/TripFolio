## Frontend
### Technologies
The frontend stack consists of react using vite, tailwindcss, lucide-react for iconography, all using typescript.

### Code structure

- Keep feature UI under `frontend/src/pages/<feature>`. When a feature has
  several views or substantial subcomponents, group them in named subdirectories
- Keep reusable server-state hooks under `frontend/src/queries`, organized by
  entity (`trips.ts`, `itineraries.ts`, `events.ts`). Feature components should
  consume hooks such as `useTrips` and `useEvents` instead of defining their own
  `useQuery` fetchers.
- Keep server data in React Query. After a successful create, update, or delete,
  update or invalidate the relevant entity query so every consumer sees current
  data. Keep local UI state (open dialogs, form drafts, and selection) in React.
- Put shared API transport in `frontend/src/utils/api.ts`; use its typed
  `getFromApi`, `postToApi`, `patchToApi`, and `deleteFromApi` helpers rather
  than creating a separate HTTP client in a feature.
- Use TypeScript interfaces or types for API records and component props. Share
  entity types from the corresponding query module when both data hooks and UI
  components need them.
- Define frontend functions with `const name = () => {}` syntax. Document
  functions with JSDoc that explains what they do, how they work, their
  parameters, and their return value. Add inline comments only where the code
  would otherwise be hard to follow.
- Keep components focused. Move substantial presentation or business logic
  into a dedicated component or hook instead of combining unrelated jobs in a
  single view.

### Design system
- Before frontend UI work, read and follow `.agents/design-system.md`. It is the source of truth for shared components, visual conventions, and component-selection guidance.

### Checking your work
- Run validation before commiting or pushing. DO NOT run after every turn with the user.
```
npm run typecheck
npm run format:fix
npm run lint
npm run test        # If applicable
npm run e2e:ci      # If applicable, starts dev server and runs cypress tests headlessly
```

### Writing tests
- For unit tests, mirror the main repository's structure, but under /frontend-root/test
- For cypress tests, always separate fixture data from the .cy file itself. They should be in a separate directory.
- Additionally, use stable data-cy tags instead of fragile selectors such as class.
