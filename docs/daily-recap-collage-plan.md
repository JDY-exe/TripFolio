# Daily recap collage: implementation plan

Status: proposed implementation plan; no generator has been implemented yet.

Related: [Other collage ideas](collage-ideas.md) · [Photo API](photo-api.md) ·
[Shared design system](../.agents/design-system.md).

## Goal

Automatically turn a trip day's photographed events into a shareable image:
**"What we did today"**. Users should not have to choose a template, select
photos, arrange a collage, or configure export settings.

For past days, use **"A day on [trip name]"** rather than calling it today.
Do not infer a destination from a trip name, an arbitrary address, or coordinates.
A verified destination name can be added later.

### MVP decisions

- Entry point: **Daily recap** in the trip's Album, outside album edit mode.
- Open a preview of the most recent eligible day automatically.
- Include one uploaded album photo per linked event, in event order.
- Include only events whose start time has passed, inside the itinerary dates.
  A scheduled event alone is not evidence of a visit; a valid photo association
  is required. Link confidence/confirmation belongs to the linking feature.
- Produce as many images as needed, with at most four events per image.
- Use one automatic visual style and one export size: **1080 × 1350 (4:5)**.
- Share or download the currently previewed image, one at a time.
- Do not save generated images on the server or create public share links.

## Current repository constraints

- `backend/models/Photo.js` and `frontend/src/queries/photos.ts` have dimensions
  and upload timestamps, but no event link, capture timestamp, or photo GPS.
- `backend/utils/photoValidation.js` strips embedded metadata; originals are
  discarded. Historical capture dates/GPS cannot be recovered from stored files.
- Events already have titles, start/end times, optional coordinates, and a
  `restaurant` flag. The itinerary currently groups events by the UTC date of
  `startTime`; there is no trip-timezone field.
- `usePhotos` is cursor-paginated. The photos already visible in the Album are
  not necessarily the entire trip album.
- Album content is private and requires bearer authentication. A public trip
  does not make its album public.
- Images displayed on event cards by `useEventPhoto` come from Google Places;
  they are not the user's uploaded photos and must not be used in these recaps.

## Dependency: photo-to-event linking

**Production release is blocked until usable photo-to-event associations exist.**
The generator can be developed and tested with fixtures in parallel, but it must
not guess associations from upload dates or substitute Google place photos.

Proposed minimal interface to agree with that feature:

- Add an optional `eventId` to Photo metadata and the shared `TripPhoto` type.
  Existing records remain valid and unlinked.
- A photo has at most one primary event association for this MVP. The linker
  owns creating, correcting, and removing it; the generator is read-only.
- Validate on the server that the linked event belongs to the photo's trip via
  its itinerary. Reject cross-trip associations and require existing edit
  permission for link mutations. Do not relax the photo upload route's current
  multipart contract merely to support this field.
- Expose the association through the existing authenticated photo metadata API.
- Linking mutations invalidate the affected trip's photo query. Event changes
  refresh the event query; the recap derives its content from both sources.
- Missing/deleted event references are ignored safely. Deleting an event must
  not delete the user's album photo. The linking feature owns unlink cleanup.
- No compulsory linking UI is added inside the generator. Any upstream review
  of uncertain location/time matches belongs to the photo-linking workflow.

GPS extraction, capture-date preservation, proximity thresholds, and automatic
matching are separate work. If they are needed by the linker, extract permitted
metadata from originals before normalization; this cannot backfill old uploads.
A confirmed event link alone is enough for this generator's day grouping.

## User flow and layout

1. From **Album**, tap **Daily recap**. Keep Add photos as the existing primary
   album action; do not add another navigation section or a creation wizard.
2. Load the itinerary, events, and complete album metadata, then build the recap
   list. Show progress in the dialog, with cancellation available.
3. Open the most recent eligible day. A compact date selector lists only days
   with eligible photos; changing it regenerates that day's preview automatically.
4. Show one large image preview. When the day produces multiple images, provide
   Previous/Next controls and **"Image 1 of 2"**. No manual slide arrangement.
5. Show **Share image** where file sharing is supported and **Download image**
   everywhere. Unsupported devices get Download with brief Instagram guidance.

Use the shared `Modal`, `Button`, `IconButton`, `Text`, and loading components
from the common barrel. On desktop, use a bounded wide dialog with a large
preview; on phones, use most of the viewport while keeping actions reachable
and the content scrollable. Preserve dialog focus management, visible focus,
44px-or-larger action targets, and reduced-motion behavior.

The preview needs a readable text equivalent listing the date and included
events; important labels must not exist solely inside the raster image.

### Automatic image composition

Keep images photo-led and consistent with TripFolio's existing typography and
restrained teal identity, rather than creating a new scrapbook theme.

- Reserve a short header for the title, trip name, and date.
- **1 photo:** a large single-photo layout; never duplicate it to fill slots.
- **2 photos:** two equal cells; use side-by-side for two portrait photos,
  otherwise stacked cells.
- **3 photos:** one larger photo followed by two smaller cells.
- **4 photos:** a two-by-two grid.
- Put short event labels in reserved caption space, not over busy photographs.
  Bound/wrap long titles and ellipsize only after a defined line limit.
- Use center crops with deterministic layout rules. No face detection or claims
  of intelligent subject selection in v1. Crop editing is outside MVP scope.
- Export a fixed light composition regardless of the user's app color scheme,
  and composite transparent photos onto its background.

## Generation rules

Implement these as pure, independently tested functions:

1. Deduplicate photo metadata by ID across loaded pages.
2. Keep ready, accessible album photos with a valid same-trip event link.
3. Group by linked event, then by that event's itinerary day. Never use
   `Photo.createdAt` as the date the photo was taken.
4. Match current itinerary semantics: derive `YYYY-MM-DD` in UTC and format
   date labels in UTC too. Use the same convention to determine "today".
   Explicit trip-local timezones are deferred; do not silently use the browser's
   timezone and shift a recap to a different day than its itinerary.
5. Sort events by `startTime`, then event ID for a stable tie-breaker.
6. Select one representative photo per event: greatest stored pixel area, then
   photo ID as the stable tie-breaker. This is a simple resolution heuristic,
   not an assertion that the image is aesthetically best.
7. Split that ordered list into consecutive groups of at most four. An event
   and its photo appear once per daily recap. Distinct events at the same place
   remain distinct; location-level deduplication is deferred.
8. Produce a serializable slide description containing its date, event labels,
   selected photo IDs, layout, and image position within the day.

No selectable templates, caption authoring, statistics, route maps, image
recognition, photo replacement controls, ZIP exports, or bulk sharing in v1.

## Technical implementation sequence

### 1. Establish the linking contract

Agree on and implement the association interface above with the photo-linking
feature. Update the Photo model, metadata serializer, `TripPhoto`, and
`docs/photo-api.md` as appropriate. Test trip membership, cross-trip rejection,
legacy unlinked records, link removal, and deletion behavior.

This step is a release prerequisite, not permission to build a second automatic
linker inside the collage feature.

### 2. Add data preparation and selection

- Keep feature code under `frontend/src/pages/trip/album/collage/`.
- Add a pure `dailyRecap.ts` module for grouping, selection, and slide descriptions.
- Add a focused `useDailyRecap` hook to compose existing `useItinerary`, `useEvents`,
  and `usePhotos` hooks. Continue server state in React Query; do not copy it into
  a separate feature store or create a second HTTP client.
- On demand, fetch remaining metadata pages sequentially through the shared photo
  query, respecting its existing in-flight fetches. Do not generate a supposedly
  complete recap from the first 60 photos. Expose page-load errors and allow retry.
- Keep selected date, image index, generation state, and output Blob in local UI
  state. Recompute when photo associations, event dates/titles, or photos change;
  discard obsolete output and ignore late results after closing/changing trips.

### 3. Render the actual export and reuse it as the preview

- Add a `renderDailyRecap.ts` Canvas 2D renderer. No DOM screenshot library or
  server rendering endpoint is needed for this fixed image composition.
- Fetch protected photo Blobs through the existing authenticated API transport
  and account-scoped photo-content cache, exposing shared query helpers from
  `queries/photos.ts` if necessary. Do not load content URLs directly via `<img>`
  or embed bearer tokens in URLs.
- Decode only the current image's photos, at most four, with bounded concurrency.
  Wait for the required fonts before drawing; handle font or image-load failures
  explicitly. Confirm export font assets can load reliably on deployed devices.
- Draw at final resolution and encode a JPEG with `canvas.toBlob`, initially at
  quality 0.9. Verify the actual MIME type and handle a null/failed result.
- Preview this exact generated Blob so the download and share match the preview.
- Release object URLs, decoded bitmaps, and canvas resources on replacement/close.
  Avoid retaining a decoded full album or generating every slide at once.

### 4. Add the minimal dialog

- Add `DailyRecapModal.tsx` and a focused preview component as needed.
- Wire the Album entry point in `AlbumView.tsx`; keep it out of edit/delete mode.
- Add the date selector, current-image navigation, status, and export actions.
- Keep loading, error, empty, and successful preview states mutually exclusive.
- Request generation only when the dialog is open; do not slow normal album browsing.

### 5. Add one-image download and sharing

- Add a focused export utility, for example `utils/shareImage.ts`.
- Construct a JPEG `File` before enabling Share, with a safe filename such as
  `trip-recap-2026-06-12-01.jpg`.
- Feature-detect secure-context file sharing with `navigator.share` and
  `navigator.canShare({ files: [file] })`. This requires HTTPS in production.
- Call `navigator.share` directly from the Share click handler with the prepared
  file. Do not fetch/render first inside that handler and lose user activation.
- Use the native share sheet. Do not label this "Post to Instagram" or promise
  Instagram is installed/available, a Feed/Story destination, or publish completion.
- Treat user cancellation as normal. On other failures, offer retry and Download.
  Do not show "Posted to Instagram" after a share promise resolves.
- Download the same Blob using an object URL; release the URL after the browser
  has had time to consume it. Test phone-browser download behavior explicitly.
- No social login, public URL, Instagram publishing API, or native deep-link hack.

### 6. Validate and ship

- Add unit tests under `frontend/test/pages/trip/album/collage/` and
  `frontend/test/utils/`, mirroring implementation paths.
- Add Cypress coverage with stable `data-cy` tags and separate fixtures under
  `frontend/cypress/fixtures/`. Mock browser sharing; browser tests cannot assert
  the real OS share-sheet contents or that Instagram published an image.
- Manually inspect generated JPEGs and responsive previews at phone and desktop
  sizes. Test real iOS Safari and Android Chrome share/download handoffs, plus
  desktop and unsupported-browser fallback behavior.
- Run `npm run typecheck`, `npm run format`, `npm run lint`, `npm run test`, and
  `npm run e2e:ci` from `frontend/` before committing. The current formatter script
  is `format`, not `format:fix`. Run backend photo/linking tests when that code changes.
- Run the Impeccable detector once over changed web UI files after implementation.

## Required states and acceptance checks

| Situation | Expected behavior |
| --- | --- |
| No album photos | Explain that photos are needed; retain the existing Add photos path. |
| Photos exist but none are linked | Explain that event-linked photos are needed; never fabricate a daily story from upload dates. |
| Some events have no linked photos | Omit those events without blank cells or third-party placeholders. |
| 1 / 2 / 3 / 4 eligible events | Use the corresponding automatic layout with one photo per event. |
| More than 4 eligible events | Generate additional images in chronological order, individually shareable. |
| Album has more than one metadata page | Consider every page before finalizing the available days and slides. |
| Future event, missing event, invalid date, or out-of-trip event | Exclude safely; do not crash or imply a future activity already happened. |
| Portrait, landscape, transparent, small, or long-caption content | Produce a valid bounded layout; inspect crop and text readability in the actual JPEG. |
| A selected photo fails to load | Try the next ranked photo for that event; if none load, show retry rather than silently exporting an incomplete preview. |
| Photos/links/events change while open | Invalidate stale output and rebuild; never share an image from a different selected day. |
| User signs out or changes trips | Close/discard private output and pending results; retain no cross-account generated-image cache. |
| Sharing supported | Native share sheet receives exactly the currently previewed JPEG. |
| Sharing unsupported or rejected | Download remains available; cancellation is not displayed as an error. |

Read/export permission follows existing private album read access, including
trip viewers; generation does not modify trip data or visibility. Share and
Download are explicit user actions, and exported images can leave TripFolio.
Exclude GPS, confirmation numbers, notes, precise addresses, and spending from
exports. This does not make an exported image revocable after it has left the app.

## Suggested delivery slices

1. **Prerequisite:** same-trip event associations exposed on photo metadata.
2. **Generator:** tested automatic selection and 1–4-photo JPEG compositions.
3. **UI:** Album dialog, date/image browsing, and download.
4. **Sharing and release:** native file sharing, fallback states, device checks,
   and full validation. Release only when slice 1 supplies real associations.
