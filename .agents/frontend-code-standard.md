## Frontend code standards

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

### Formatting and checks

- Frontend dependencies and scripts live in `frontend/package.json`. Run
  formatting from `frontend` with `npm run format` or check it with
  `npm run format:check`.
- Run `npm run typecheck` after TypeScript changes. Use `npm run lint` and
  `npm run test` when appropriate; add unit tests for complex or important
  logic. Cypress tests belong in separate spec and fixture files.
- Run validation once the feature is polished instead of after each small
  edit. Avoid broad formatting changes outside the files involved in the task.
