# Checked editing and record versions

## Deployment

Run from the backend directory against the target database **before deploying the checked-write API**:

```sh
node scripts/backfillRecordVersions.js
```

`MONGO_URI` is taken from the environment or `backend/.env`. The script only sets
`version: 0` where the field is absent. It uses raw collections so timestamps,
relationships, business fields, and existing version values are unchanged. It
can be run repeatedly. Covered models: Event, Reservation, Itinerary, Trip,
ArchivedItineraryNote. This command has not been run against a live database as
part of development.

Deploy frontend and backend together: legacy flat PATCH bodies are deliberately
rejected by checked editor endpoints. There is no force-update endpoint.
MongoDB transactions still require a replica set, as the reservation API already
did before this change.

## Contract

Editor PATCH requests contain `expectedVersion`, `changes`, and `original`.
Both objects use editable field paths; reservation details use dotted paths,
for example `accommodations.address`, `rentals.company`, or `flights.segments`.
Only modified fields belong in the request. Address/place-ID pairs must be sent
together. Segment arrays and explicit itinerary action selections are atomic
logical fields. `itineraryActions` is a batch of linked-record edits, not a stored
reservation array: its existing events' start/end times merge independently,
including edits to separate linked events. Flight summary fields are derived
from segment arrays on the server and are not sent by flight editors.

A stale version triggers comparisons only for changed fields. Disjoint changes
merge. Overlapping changes return HTTP 409 with `code: EDIT_CONFLICT`, `current`,
and `conflicts`. Coupled conflicts carry a `group` of paths; the dialog keeps
their choices together. Linked scalar conflicts include `rootField` and a readable
`label`; `mergedChanges` preserves already-merged parts of their write batch while
the user chooses values for overlapping scalars. Reservation checks collect booking
and linked-action conflicts together before responding. Whenever an action batch
was submitted, conflict responses include its safely merged changes, even if only
a booking field conflicts. This lets the client rebase the complete patch without
silently approving unchecked overwrites or reverting merged action times.
A conflict response writes nothing. Merged records still
undergo schema and business validation. Conditional event writes reload and
recompare if a race is lost; MongoDB retries transactional write conflicts.

Explicit itinerary action selections are projected onto the reservation response
used for conflict resolution as `itineraryActions`. An edit to a linked event
also touches that reservation's version inside the same transaction. This
protects selection changes and deletion confirmation without locking the trip.
Metadata synchronization preserves personal event notes and slots. Booking list
and detail snapshots include linked action slots. Flight journey time edits submit
those dependent slots as a checked logical field, so a concurrent itinerary-time
edit is reviewed rather than silently overwritten. Flight summary fields on the
reservation itself are still derived server-side from its segment array.

Deletes require the confirmed record's `expectedVersion` in the JSON body.
Stale confirmations return a conflict with an empty conflict list; clients close
the confirmation, refresh the collection, and require review and a new explicit
confirmation. Never automatically retry a delete with a fresh version.

## Write-path audit

- Editable model `save()` operations use Mongoose optimistic concurrency with
  the explicit `version` key (not `__v`), including reservation/event synchronization.
- Query `updateOne`, `updateMany`, and `findOneAndUpdate` middleware increments
  versions, including coordinate caching, membership/visibility commands,
  reservation references, archive sharing, and itinerary initialization.
- Replacements and model bulk writes are rejected; use checked updates or
  versioned document saves. New documents start at zero.
- Reservation edit/delete and linked event changes run in a transaction. Event
  conflicts are checked before the CAS write; reservation conflicts are checked
  before mutating the booking or its linked events.
- Trip deletion conditions the root deletion on the confirmed version; cascading
  editable-document deletions use the transaction's session. Existing external
  photo/GridFS cleanup is not transactional and retains its existing retry/error
  behavior; MongoDB cannot roll back object-storage deletions.
- The legacy flight-to-segments raw-collection migration now conditions writes on
  each observed version and increments it. Planning reset/restore is an explicit
  administrative delete/recreate operation, not an editor update; restored
  documents retain their saved version. The version backfill is the only raw
  update that intentionally does not increment versions.
- Add new editor fields to the endpoint allowlist and frontend diff projection.
  Do not use a plain query update for a user-submitted replacement draft.

## Editor lifetime

`useEditorSnapshot` keeps the original local to the mounted editor, opens from
cached data, and attempts one non-blocking fresh read per opening. Cache updates
never reset an open draft. A fresh read may replace early typing, but is ignored
after closing, switching records, or starting a save. Failure leaves editing and
Save available. Linked action drafts follow the same best-effort policy.

`saveChecked` opens the shared field-choice dialog only for overlapping edits.
The retry preserves unrelated draft changes, uses originals from `current`, and
runs the same checked API flow. Ordinary validation/network errors continue to
the editor's existing error handler.

## Tests

- `backend/test/checkedUpdate.test.js`: field merging, same-field conflicts,
  deterministic CAS races, validation, normalization, atomic arrays, delete
  versions, and idempotent backfill.
- `backend/test/reservationTransactions.test.js`: staged transaction rollback,
  disjoint booking merges, complete booking/action conflict resolution and retries
  (including another edit while the dialog is open), conflicting multi-record rollback, synchronization
  versions, and action-selection regressions. `reservationActionMerge.test.js`
  also covers independent linked records/fields and version-checked removals.
  This is a contract harness, not
  a replacement for testing real MongoDB transaction retry behavior.
- `frontend/test/utils/checkedSave.test.ts`: minimal patches, coupled identities,
  normalization, no dialog on automatic merges, and rebased conflict choices.
- `frontend/cypress/e2e/edit-concurrency.cy.ts`: refresh failure, saved-versus-draft
  choices at desktop/mobile widths, preserving unrelated notes, and ignoring a
  late initial refresh once saving has begun.
