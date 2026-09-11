## Frontend
### Technologies
The frontend stack consists of react using vite, tailwindcss, lucide-react for iconography, all using typescript.

### Standards
- Always document your code. Write JSDocs for functions. Your JSDocs should contain a brief explanation of WHAT the function does and HOW it does it, as well as brief explanations for parameters and returns.
- Use inline comments sparingly for code that is hard to read/understand.
- Unit test any complex or important logic.
- Avoid everything-components. If a component contains both complex business logic and DOM elements, split it up.
- Address code debt by informing the reviewer, and add inline TODO comments for anything that's out of scope.

### Checking your work
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