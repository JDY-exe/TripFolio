## Frontend
### Technologies
The frontend stack consists of react using vite, tailwindcss, lucide-react for iconography, all using typescript.

### Standards
Refer to `.agents\frontend-code-standard.md` for frontend standard invariants.

### Design system
- Before frontend UI work, read and follow `.agents/design-system.md`. It is the source of truth for shared components, visual conventions, and component-selection guidance.

### Checking your work
- Run validation after the feature is polished, not after every incremental change.
- Consider running the below commands to check your work after.
```
npm run typecheck
npm run format:fix
npm run lint
npm run test        # If applicable
npm run e2e:ci      # If applicable, starts dev server and runs cypress tests
```

### Writing tests
- For unit tests, mirror the main repository's structure, but under /frontend-root/test
- For cypress tests, always separate fixture data from the .cy file itself. They should be in a separate directory.
