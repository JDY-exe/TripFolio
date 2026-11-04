# Share highlights: automatic recap collages

Status: implemented in the frontend. Real iOS Safari and Android Chrome native
share/download handoffs still need manual device verification.

Related: [Other collage ideas](collage-ideas.md) · [Photo API](photo-api.md) ·
[Shared design system](../.agents/design-system.md).

## Scope

Automatically turn event-linked album photos into individually shareable images.
No compulsory photo selection, templates, crop editor, manual arrangement,
caption authoring, public links, or export settings.

- Entry point: **Share highlights** in Album, outside edit mode. Available to
  private album readers, including viewers and archived-trip participants.
- Choose Daily recap, Dining recap, or Single-experience recap from three
  compact, vertically stacked icon-and-label rows without decorative artwork
  or secondary descriptions.
- All choices lead to the same preview/export interface. Back returns focus to
  the selected format row, unmounts the browser, and releases generated output.
- Daily recap: open the most recent eligible day; one photo per event in
  chronological order. Split days with more than four events into more images.
- Dining recap: one photo per restaurant event across the trip, in chronological
  order. Four-photo images use a hero above three supporting photos; smaller
  sets adapt without fillers. More than four events produce additional images.
  Multi-day images display their actual covered date range.
- Single-experience recap: require at least three distinct photos linked to one
  eligible event. Prefer a landscape establishing photo, then two supporting
  photos, with unused photos as fallbacks. Choose the most recent eligible event
  automatically; other events are selectable independently, even on the same day.
  Use neutral “At [event title]” wording, without inventing a time of day.
- Export **1080 × 1350 (4:5) JPEG**, with a fixed light composition regardless of
  application theme. Transparent photos composite onto the background.
- Preview the actual export Blob. Share/download only the currently shown image.
- Keep Add photos as the existing primary Album action.
- Do not persist generated images on the server or change trip visibility.

## Existing linking contract and limitation

`backend/models/Photo.js`, the metadata serializer, and `TripPhoto` already expose
`linkedEvent`, optional camera-local `takenAt`, and optional location metadata.
There is no need for a second `eventId` field or another automatic linker.

The current upload handler chooses the nearest geolocated event within 500 m
from the trip's itinerary. It does not confirm the association or disambiguate
multiple nearby events using capture time. The recap follows this existing
association; it must not describe it as a verified visit. Improving association
confidence and adding correction/removal controls belong to the linking feature,
not the collage generator. Inaccurate associations can yield inaccurate recaps.

The generator is read-only:

- Match `linkedEvent` against the current itinerary's event collection.
- Ignore unlinked photos, cross-trip photo metadata, and missing/deleted events.
- Never infer a link from upload dates or use Google Places event-card photos.
- Never delete an album photo when its event disappears.
- Use event itinerary dates, not capture dates, to group this format.
- Legacy records without capture/location metadata remain usable if linked.

Future link mutations must invalidate the affected trip's shared photo query.
Event edits must refresh the shared event query. The recap derives from both.

## Data preparation

Implementation: `frontend/src/pages/trip/album/collage/dailyRecap.ts`,
`highlights.ts`, and `useHighlights.ts`. Every format reuses the daily selector’s
validated event/photo pool and the same complete-metadata query hook.

1. Compose existing `usePhotos`, `useItinerary`, `useEvents`, and `useTripDetails`
   hooks; retain all server state in React Query.
2. Fetch all album metadata pages on demand, respecting ongoing query fetches.
   Do not finalize a recap from the first 60 photos. Errors stop automatic
   pagination and offer retry.
3. Deduplicate metadata by photo ID; group by same-trip linked event.
4. Exclude invalid timestamps, events outside itinerary date bounds, and events
   whose start time has not passed. A scheduled event alone contributes nothing.
5. Follow existing itinerary UTC date semantics, including date labels and
   “today”; do not shift days to browser-local time. A 30-second clock refresh
   admits newly started events and updates wording across midnight.
6. Sort events by start time, then event ID. Rank photos per event by greatest
   stored pixel area, then photo ID. This is a resolution heuristic, not a claim
   of aesthetic quality.
7. Split each day into consecutive groups of at most four events. Keep ranked
   photo alternatives for load failures. Do not repeat photos to fill cells.

## Rendering

Implementation: shared `renderRecap.ts`.

- Canvas 2D at final resolution; no DOM screenshot dependency or server endpoint.
- One photo: large single cell.
- Two photos: side by side when both selected photos are portrait, otherwise
  stacked.
- Three photos: one wide cell above two supporting cells.
- Four photos: two-by-two grid for daily recaps; one hero above three smaller
  cells for dining recaps.
- Experience recaps use the three-photo hero layout with the event title in the
  header, not repeated under every image. Never reuse a fallback photo in two
  cells; fail with Retry rather than exporting duplicates or a partial image.
- Center crops, consistent gutters, reserved caption space, bounded labels with
  two-line limits and final-line ellipsis. No face detection or crop editing.
- Title, trip name, date, small TripFolio footer, and image position within day.
  Past-day wording is “A day on our trip”; the trip name is shown separately.
- Figtree uses the app's bundled/self-hosted font, awaited before drawing; the
  export does not depend on the remote Instrument Serif stylesheet.
- Load authenticated photo Blobs through shared account-scoped photo-content
  query options. Never embed bearer tokens in URLs.
- Decode/draw/release one photo at a time. Try the next ranked candidate on load
  failure. If all candidates fail, show Retry image, not a partial export.
- Encode JPEG at quality 0.9 and verify the MIME type and non-null result.
- Abort obsolete work, ignore late results, revoke preview/decode object URLs,
  and clear canvas backing storage on completion/failure.

## Dialog and exports

Implementation: `HighlightsModal.tsx` owns scope and navigation;
`HighlightChooser.tsx` renders compact format rows; `RecapBrowser.tsx` provides shared
selection and navigation; `RecapPreview.tsx` owns generation, skeleton and file
actions. The Album entry point is in `AlbumView.tsx`; file handoffs are in
`frontend/src/utils/shareImage.ts`.

Use the shared Modal, Button, IconButton, Text, and Skeleton components.
The compact dialog provides a day or experience selector (none for trip-wide
dining), Previous/Next controls and image count only for multi-image groups,
accessible date/event descriptions, and mutually
exclusive loading, error, empty, and preview states. A shared 4:5 frame reserves
identical space for the image skeleton and final export, with a reserved action
row so generation does not resize the modal. The mobile content scrolls; the
image is bounded to leave room for navigation and actions.

Generation runs only while the dialog is mounted. Account/trip changes unmount
private output; source changes rebuild the image and immediately disable stale
export actions. Selected date and image position are local UI state.

- Construct a JPEG File before enabling Share.
- Detect secure-context `navigator.share` and `navigator.canShare({files})`.
- Invoke sharing immediately from the click handler with the prepared file so
  user activation is retained.
- Use **Share**, not “Post to Instagram”. The native share sheet controls
  available apps/destinations; resolution of its promise is not publication.
- Treat cancellation normally. Other failures offer retry and Download.
- Always provide **Download**, using the exact same file. Revoke download
  object URLs after a short consumption window.
- Unsupported browsers show Download as the primary action, without a disabled
  Share button or extra app-specific instructions.

Exports intentionally allow private photos to leave TripFolio and cannot be
revoked afterward. Do not export GPS, precise addresses, notes, confirmation
numbers, or spending. No social login, publishing API, or public share URL.

## Validation

Unit tests mirror source paths under `frontend/test/` and cover selection,
ordering, date grouping, deduplication, all layouts, fallback candidates,
cancellation, font/encoding failures, resource cleanup, sharing detection,
cancellation handling, and download file identity.

Cypress coverage: `frontend/cypress/e2e/share-highlights.cy.ts`, with fixture data in
`frontend/cypress/fixtures/share-highlights.json`. It exercises the actual Canvas
renderer, complete pagination, all three formats, chooser/back/reopen behavior,
date/event/image navigation, JPEG download, mocked native sharing, unlinked
content, fixed modal geometry during generation, and image-load retry. Unit tests
also cover restaurant filtering, distinct experience photos and fallback reuse.
OS share sheet contents
and actual publication cannot be asserted in browser automation.

Run from `frontend/`:

```
npm run typecheck
npm run format
npm run lint
npm run test
npm run e2e:ci
```

Inspect actual JPEG output and phone/desktop previews. Real-device checks still
needed before release: iOS Safari and Android Chrome native file sharing,
download location/opening behavior, unsupported-browser fallback, and large
real-world portrait/landscape photos with long captions. Review the upstream
proximity-linking limitation before presenting recaps as reliable trip records.

## Deferred

Postcards, whole-trip recaps, map/statistic formats, trip-local
timezones, photo replacement, face-aware crops, custom captions, style controls,
manual slide arrangement, ZIP export, bulk sharing, and direct social publishing.
