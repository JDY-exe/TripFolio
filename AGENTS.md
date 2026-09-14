## Frontend
### Technologies
The frontend stack consists of react using vite, tailwindcss, lucide-react for iconography, all using typescript.

### Standards
- Always document your code. Write JSDocs for functions. Your JSDocs should contain a brief explanation of WHAT the function does and HOW it does it, as well as brief explanations for parameters and returns.
- Use inline comments sparingly for code that is hard to read/understand.
- Unit test any complex or important logic.
- Avoid everything-components. If a component contains both complex business logic and DOM elements, split it up.

### Common components
- Reuse the components exported from `frontend/src/components/common` instead of recreating equivalent controls or styling raw elements. Extend the common component when a reusable capability is missing.
- Use the custom toast API exported from `frontend/src/components/common` for user-facing notifications. Call `displayAlert(...)`; do not introduce browser alerts, ad hoc notification banners, or another toast library.
- Use `useLoading()` from `frontend/src/contexts/LoadingContext` for screen-blocking asynchronous work. Call `setLoading(true)` before the operation and restore it with `setLoading(false)` in a `finally` block. Do not create page-specific full-screen loading overlays or use a different loading context.
- Use `LoadingIndicator` for inline or decorative waits whose duration is unknown. This is the M3 Expressive morphing-shape loader; configure it with `size`, `color`, `contained`, `containerColor`, and `shapeDuration` instead of building a page-specific spinner.
- Use `CircularProgressIndicator` when communicating the progress of a process. Pass `value` and `max` for determinate progress, or `indeterminate` when the amount is unknown. Its active indicator uses the M3 Expressive wavy treatment while its remaining track stays circular. Prefer its `size`, `thickness`, `color`, `trackColor`, `waveAmplitude`, `wavelength`, `gap`, and `animationDuration` props over custom SVG or CSS progress rings.
- Do not use `LoadingIndicator` and `CircularProgressIndicator` interchangeably: the former is an expressive wait animation, while the latter has progressbar value semantics and can represent measurable completion.
- Use `MediaUpload` for native image, video, audio, or unrestricted file selection. Configure the surface with `width` and `height`, selection with `mediaType` and `multiple`, and its pending state with `loading` and `loadingIndicatorType` (`expressive` or `circular`). The optional `onFilesSelected` callback receives filenames only.
- `MediaUpload` currently does not upload, read, preview, or retain file contents. It calls `displayAlert(file.name)` once per selected file, reports names through `onFilesSelected`, and clears the input so selecting the same file again still produces a change event. Extend the common component when real upload behavior is implemented rather than adding that behavior to individual pages.

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
