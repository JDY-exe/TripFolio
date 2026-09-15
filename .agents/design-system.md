# TripFolio common design system

The public design-system API is exported from
`frontend/src/components/common/index.ts`. Import from that barrel rather than
from component implementation paths. `ScreenLoadingOverlay` is the one internal
shell component and is documented separately below.

```tsx
import { Button, Text, displayAlert } from '../../components/common';
```

All components accept `className` where appropriate. Prefer their semantic
props first and use `className` for layout or exceptional presentation. Colors
come from the semantic theme tokens in `frontend/src/index.css`, and animated
components respect reduced-motion preferences.

## 1. Button

The standard control for visible text actions. It renders a native `<button>`,
defaults to `type="button"`, and forwards native button attributes.

```tsx
<Button variant="secondary" size="lg" leadingIcon={<Camera />}>
  Add picture
</Button>
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `variant` | `primary \| secondary \| outline \| ghost \| danger` | `primary` | Selects the semantic color treatment. |
| `size` | `sm \| md \| lg` | `md` | Controls minimum height, padding, and spacing. |
| `fullWidth` | `boolean` | `false` | Makes the button fill its container. |
| `leadingIcon` | `ReactNode` | — | Places an icon before the label. |
| `trailingIcon` | `ReactNode` | — | Places an icon after the label. |

Use `Button` when the action has visible text. Disabled buttons use native
`disabled` behavior and become non-interactive.

## 2. IconButton

A compact, circular button for icon-only actions. It shares Button's variants
and control sizes. The required `label` prop is rendered internally as hidden
button text, keeping feature code free of ARIA-label plumbing.

```tsx
<IconButton label="Delete trip" icon={<Trash />} variant="danger" />
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `label` | `string` | Required | Names the action through hidden text. |
| `icon` | `ReactNode` | Required | Supplies the visible icon. |
| `variant` | `primary \| secondary \| outline \| ghost \| danger` | `ghost` | Selects the semantic color treatment. |
| `size` | `sm \| md \| lg` | `md` | Produces a 36, 44, or 48 pixel square control. |

Use this only when the icon communicates the action visually. Use `Button`
when a visible label would make the interface clearer.

## 3. Text

The default typography primitive. It is polymorphic: `as` chooses semantic HTML
while `variant` controls appearance independently.

```tsx
<Text as="h2" variant="headline">Profile Info</Text>
<Text color="muted">email@example.com</Text>
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `as` | `ElementType` | `p` | Selects the rendered element. |
| `variant` | `display \| headline \| title \| body \| label \| caption` | `body` | Selects the type scale. |
| `color` | `inherit \| default \| muted \| primary \| error \| on-primary` | `default` | Selects a semantic foreground color. |
| `children` | `ReactNode` | Required | Supplies the text or inline content. |

Use `Text` for routine headings, labels, descriptions, and body copy. Choose
semantic elements such as `h1`, `h2`, `label`, `dt`, and `dd` through `as`.

## 4. Display

The expressive Google Sans Flex primitive for a small number of high-impact
headlines. It exposes all six variable-font axes and uses fluid sizing. Routine
page and section headings should remain `Text`.

```tsx
<Display as="h1" size="headline" width={72} slant={-8} roundness={90}>
  Your account
</Display>
```

| Prop | Type | Default | Supported range or purpose |
| --- | --- | --- | --- |
| `as` | `ElementType` | `p` | Selects the rendered element. |
| `size` | `hero \| headline` | `hero` | Selects the fluid display scale. |
| `color` | `inherit \| default \| muted \| primary` | `default` | Selects the semantic foreground. |
| `weight` | `number` | `620` | `wght`, 1–1000. |
| `width` | `number` | `100` | `wdth`, 25–151. |
| `opticalSize` | `number` | `72` | `opsz`, 6–144. |
| `slant` | `number` | `0` | `slnt`, -10–0. |
| `grade` | `number` | `0` | `GRAD`, 0–100. |
| `roundness` | `number` | `0` | `ROND`, 0–100. |

Axis values are passed directly to the font. Keep display copy short and check
small screens when using wide axis values or large unbreakable text.

## 5. TextField

A labeled native text input with optional hint or validation copy. Native input
attributes such as `name`, `type`, `autoComplete`, `required`, and `disabled`
pass through; native `size` is intentionally omitted.

```tsx
<TextField
  id="email"
  name="email"
  type="email"
  label="Email"
  hint="Use the address connected to your account."
/>
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `id` | `string` | Required | Connects the visible label and supporting copy. |
| `label` | `string` | Required | Supplies the visible field label. |
| `hint` | `string` | — | Shows supporting text below the input. |
| `error` | `string` | — | Shows error text and applies the invalid treatment. |

When both `error` and `hint` are supplied, the error is displayed. Validation
and form state remain the responsibility of the consuming feature.

## 6. LoadingIndicator

An indeterminate M3 Expressive wait animation rendered on a canvas. It morphs
through seven shapes and becomes static when reduced motion is requested.

```tsx
<LoadingIndicator size={64} contained shapeDuration={3000} />
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `label` | `string` | `Loading` | Supplies fallback text for the canvas. |
| `size` | `number` | `48` | Sets square width and height in pixels. |
| `color` | `string` | Current text color | Sets the morphing shape color. |
| `contained` | `boolean` | `false` | Draws the circular container behind the shape. |
| `containerColor` | `string` | Translucent primary | Sets that container's color. |
| `shapeDuration` | `number` | Animator default | Sets milliseconds between morphs. |

Use this when work has an unknown duration. Use `useLoading()` for
screen-blocking work rather than creating a page-specific overlay.

## 7. CircularProgressIndicator

A determinate or indeterminate SVG progress ring. The active indicator uses the
M3 Expressive wave treatment while the remaining track stays circular.

```tsx
<CircularProgressIndicator value={3} max={5} label="Uploading photos" />
<CircularProgressIndicator indeterminate />
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `value` | `number` | `0` | Current determinate progress. |
| `max` | `number` | `100` | Value representing completion. |
| `indeterminate` | `boolean` | `false` | Uses an animated unknown-progress state. |
| `label` | `string` | `Progress` | Supplies the SVG title. |
| `size` | `number` | `52` | Sets square dimensions in pixels. |
| `thickness` | `number` | `4` | Sets track and indicator width. |
| `color` | `string` | Primary token | Sets active indicator color. |
| `trackColor` | `string` | Primary-container token | Sets remaining-track color. |
| `waveAmplitude` | `number` | `2` | Sets wave height; `0` creates a circle. |
| `wavelength` | `number` | `14` | Approximates spacing between wave crests. |
| `gap` | `number` | `6` | Separates active and remaining arcs. |
| `animationDuration` | `number` | `1600` | Sets the indeterminate cycle in milliseconds. |

Invalid sizes and ranges are normalized internally. Prefer this component over
`LoadingIndicator` when progress is measurable or progress semantics matter.

## 8. ScreenLoadingOverlay

The application-shell overlay for screen-blocking work. It reads `isLoading`
from `LoadingContext`, locks document scrolling, moves focus into the overlay,
and restores both focus and scrolling when work completes. It displays a large
`LoadingIndicator` over a blurred surface.

This component has no props and is mounted once by `App`. Feature code should
not render it directly; call `setLoading(true)` and restore
`setLoading(false)` in a `finally` block through `useLoading()`.

Unlike the other components in this document, it is an internal direct import:

```tsx
import ScreenLoadingOverlay from './components/common/LoadingIndicator/ScreenLoadingOverlay';
```

## 9. MediaUpload

A shared file-picker and drag-and-drop surface for images, video, audio, or
unrestricted files. It filters dropped files, supports single or multiple
selection, and uses the shared loading indicators.

```tsx
<MediaUpload
  mediaType="image"
  multiple
  name="photos"
  onFilesSelected={(names) => setSelectedNames(names)}
/>
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `width` | CSS width | `100%` | Sets the complete surface width. Numbers mean pixels. |
| `height` | CSS height | `384` | Sets the complete surface height. Numbers mean pixels. |
| `multiple` | `boolean` | `false` | Allows more than one selected file. |
| `mediaType` | `image \| video \| audio \| any` or an array | `any` | Controls picker acceptance and dropped-file filtering. |
| `loading` | `boolean` | `false` | Replaces the picker with a loading state. |
| `loadingIndicatorType` | `expressive \| circular` | `expressive` | Selects the shared wait indicator. |
| `label` | `string` | Generated | Overrides the visible picker label. |
| `loadingLabel` | `string` | `Uploading media` | Describes the loading state. |
| `name` | `string` | `media` | Sets the hidden input's native form name. |
| `disabled` | `boolean` | `false` | Prevents picker and drop selection. |
| `onFilesSelected` | `(names: readonly string[]) => void` | — | Reports accepted filenames. |

Current limitation: `MediaUpload` does not upload, read, preview, or retain file
contents. It sends one toast per accepted filename, reports names, and clears
the hidden input so the same file can be selected again. Extend this shared
component when real upload behavior is introduced.

## 10. Modal

A controlled modal rendered directly where it appears in the React tree. It
does not use a portal or shadow DOM. The fixed overlay uses `z-[100]`, the panel
has four equally rounded corners, and opening and closing fade over 200 ms.

```tsx
<Modal
  open={isOpen}
  title="Set profile picture"
  onClose={() => setIsOpen(false)}
  footer={<Button onClick={save}>Save</Button>}
>
  <MediaUpload mediaType="image" />
</Modal>
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `open` | `boolean` | Required | Controls visibility and exit transition. |
| `title` | `ReactNode` | Required | Supplies the visible modal heading. |
| `description` | `ReactNode` | — | Adds supporting copy beneath the heading. |
| `onClose` | `() => void` | Required | Handles Close, Escape, and backdrop dismissal. |
| `children` | `ReactNode` | Required | Supplies the main modal content. |
| `footer` | `ReactNode` | — | Supplies the responsive action row. |

The modal traps Tab focus, restores the previously focused element, and keeps
itself mounted during the fade-out. Consumer `onKeyDown` and `onMouseDown`
handlers are composed before built-in behavior; calling `preventDefault()`
stops the corresponding built-in behavior.

Render `Modal` as a direct sibling of the page section so it does not inherit
layout constraints from a card or panel.

## 11. Toast

The visual component for one normalized notification. Tone selects its icon,
accent colors, and status urgency. A small `IconButton` dismisses it.

```tsx
<Toast alert={alert} onDismiss={dismissAlert} />
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `alert` | `ToastAlert` | Required | Supplies `id`, `message`, `tone`, `duration`, and optional `title`. |
| `onDismiss` | `(id: string) => void` | Required | Handles the dismiss action. |

Application features should not normally render `Toast` directly because doing
so bypasses the shared queue. Call `displayAlert(...)` instead.

## 12. ToastViewport and notification API

`ToastViewport` renders the queued notification stack. It subscribes to the
shared external store, returns nothing when the queue is empty, and is mounted
once by `App`. It has no props.

Application features should normally call `displayAlert(...)`:

```tsx
displayAlert('Photo selected');

displayAlert({
  title: 'Unable to save',
  message: 'Try again in a moment.',
  tone: 'error',
  duration: 8000,
});
```

### `displayAlert`

Accepts a message string or an `AlertOptions` object and returns the generated
toast ID.

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `message` | `string` | Required | Main notification copy. |
| `title` | `string` | — | Optional short heading. |
| `tone` | `info \| success \| warning \| error` | `info` | Selects icon, color, and urgency. |
| `duration` | `number` | `5000` | Auto-dismiss delay in milliseconds; `0` persists. |

`dismissAlert(id)` removes one toast. `clearAlerts()` removes every toast and is
primarily useful for session teardown and tests.

## Shared control tokens

The barrel also exports `buttonVariants`, `controlSizes`, `ButtonVariant`, and
`ControlSize`. These are intended for reusable controls that must visually
align with `Button`, such as `IconButton`. Feature pages should use the existing
components instead of composing raw controls from these class maps.

| Token | Values |
| --- | --- |
| `buttonVariants` | `primary`, `secondary`, `outline`, `ghost`, `danger` |
| `controlSizes` | `sm`, `md`, `lg` |
