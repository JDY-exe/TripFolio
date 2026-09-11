## Frontend
### Technologies
The frontend stack consists of react using vite, tailwindcss, lucide-react for iconography, all using typescript.

### Standards
- Always document your code. Write JSDocs for functions. Your JSDocs should contain a brief explanation of WHAT the function does and HOW it does it, as well as brief explanations for parameters and returns.
- Use inline comments sparingly for code that is hard to read/understand.
- Unit test any complex or important logic.
- Avoid everything-components. If a component contains both complex business logic and DOM elements, split it up.

### Design
- Avoid labeling everything with text. Redundant eyebrows, subtitles, section labels, and explanatory copy can make the interface feel LLM-generated.
- Convey meaning tastefully through iconography, typography, spacing, and purposeful motion rather than adding labels to every element. Respect reduced-motion preferences.
- Keep text where it adds necessary clarity. Preserve semantic headings and accessible names for controls, including icon-only actions.

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
