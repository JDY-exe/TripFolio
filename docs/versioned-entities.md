# Adding an entity to concurrent trip editing

Use this guide when adding another editable trip document, such as an Expense.
The backend helpers protect persisted writes; the frontend coordinator refreshes
the selected document and asks the user to resolve conflicts. Both must be wired
up. Adding a `version` property alone does not protect an entity.

For working examples, see the [event controller](../backend/controllers/eventController.js),
[reservation routes](../backend/routes/reservationRoutes.js),
[event query hooks](../frontend/src/queries/events.ts), and
[itinerary description editor](../frontend/src/pages/trip/itinerary/ItineraryDescription.tsx).

## The contract

- Each document has one server-owned, monotonic `version`, initially `0`.
  All editable fields in that document share it. Separate documents can be saved
  independently; different fields in the same document still conflict.
- PATCH sends only intended changes plus the original `expectedVersion`.
  DELETE sends `{ expectedVersion }` in its JSON body.
- A changed document advances its version atomically by one. A no-op preserves
  the version, but still checks that the supplied version is current.
- The form keeps its original record as its baseline and a separate local draft.
  Background refreshes update React Query, never the baseline or draft.
- Refresh only the selected document when opening an existing editor and before
  submitting. Reuse an opening request if it is still pending. Creates have no
  existing document to compare and skip this refresh.
- The backend's atomic version predicate provides correctness. A refresh cannot
  prevent another user saving between the GET and PATCH.

```text
Open cached record → background document GET → keep typing
Save → await document GET → compare baseline version
     → resolve any conflict → PATCH with expectedVersion
     → backend transaction + atomic version predicate
     → invalidate affected queries → close editor
```

## Backend helper reference

The public helpers live in [documentVersion.js](../backend/utils/documentVersion.js).

| Helper                                                         | How to use it                                                                                                                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mutationError(status, message, details?)`                     | Throw a controlled HTTP error for missing documents, access failures, or validation outside Mongoose.                                                                                                          |
| `requireVersion(value)`                                        | Validate an integer before doing expensive preparation. Missing values produce `428`; negative, fractional, string, unsafe, or non-incrementable values produce `400`. Called by `checkVersion` automatically. |
| `checkVersion(document, expectedVersion)`                      | Compare a hydrated document with the client's version. Throws a structured conflict. Called by update/delete helpers automatically; using it alone does not make a later write atomic.                         |
| `updateVersioned(document, expectedVersion, changes, session)` | Apply an allowlisted patch to a hydrated document, validate it, detect no-ops, and atomically update using both ID and version. Returns the saved document.                                                    |
| `deleteVersioned(document, expectedVersion, session)`          | Atomically delete the document matching both ID and version. Returns the removed document.                                                                                                                     |
| `sendMutationError(res, error)`                                | Serialize controlled failures, Mongoose validation errors, and conflicts. Unexpected failures get a generic `500` message. Use it in the route/controller catch block.                                         |

`throwCurrentConflict` is private to that module. When a conditional write finds
no match, it rereads the document using the supplied session and throws either a
`404` or a `409` containing the saved document. Controllers should call the public
update/delete helpers rather than reproduce this logic.

The response contract is:

| Status | Meaning                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `400`  | Invalid `expectedVersion` or invalid document content.                                                      |
| `403`  | A known trip member lacks permission to write.                                                              |
| `404`  | Document/parent missing or access hidden from a nonmember.                                                  |
| `409`  | `{ code: "VERSION_CONFLICT", message, current }`; `current` is the saved document, not the submitted draft. |
| `428`  | `expectedVersion` is missing.                                                                               |

## 1. Add the model and migration

Add this field to the new Mongoose schema:

```js
version: {
  type: Number,
  default: 0,
  min: 0,
  validate: Number.isSafeInteger,
},
```

Keep Mongoose's internal `__v` separate from the public `version`. Never accept
either value from editable payloads. New records use the schema default; construct
them from explicit fields rather than spreading `req.body`.

If documents already exist, add the model to the `models` array in
[migrateDocumentVersions.js](../backend/scripts/migrateDocumentVersions.js).
Update its help text and tests as well. A schema default does not backfill the
persisted counter needed by the atomic version predicate.

Pause application writes, then run from `backend/`:

```sh
node scripts/migrateDocumentVersions.js
node scripts/migrateDocumentVersions.js --apply
```

`migrateCollections(collections, apply = false)` is the reusable migration helper.
It preflights all supplied raw collections before writing, rejects invalid existing
versions, and sets only missing counters to `0`. It preserves existing versions,
content, timestamps, and `__v`, and can be rerun. Keep writes paused until the
matching backend and frontend are deployed. See the [backend README](../backend/README.md)
for deployment details.

Its exported `isValidVersion(version)` checks whether a stored value is a
nonnegative safe integer below `Number.MAX_SAFE_INTEGER`. The CLI's internal
`migrateDocumentVersions(apply)` loads the configured collections, connects using
`MONGO_URI`, and disconnects in `finally`; import `migrateCollections` when testing
against isolated collections.

## 2. Protect backend writes and the parent lifecycle

[withTripWrite](../backend/utils/tripWrite.js) is called as follows; its optional
fourth argument defaults to `false`:

```js
withTripWrite(
  tripId,
  userId,
  async (session, trip) => {
    // Read and write participating documents using session.
  },
  false, // ownerOnly
);
```

It starts a transaction, reloads the Trip, rechecks membership/edit permission,
and increments the Trip's internal `__v` to coordinate child writes with parent
deletion and membership changes. Pass `true` as the fourth argument for owner-only
actions. The internal lock does not increment the public Trip `version` for every
child edit. Unrelated child writes can briefly contend on this lock and retry;
this does not create a user-facing document conflict.

The related [trip access helpers](../backend/utils/tripAccess.js) expose
`getTripRole(trip, userId)` (owner/editor/viewer/null), `canReadTrip(trip, userId)`
(membership), and `canEditTrip(trip, userId)` (owner/editor). Use them for read
authorization or preliminary checks. They do not replace `withTripWrite`'s
transactional permission recheck. Public itinerary reads have their own policy;
public visibility does not grant write access or access to private child data.

Use an authenticated route. Resolve the parent from the stored child, then reread
the child inside the transaction. For example, after adding an Expense model with
`tripId`, `name`, and `notes` fields:

```js
const Expense = require("../models/Expense");
const { withTripWrite } = require("../utils/tripWrite");
const {
  mutationError,
  updateVersioned,
  deleteVersioned,
  sendMutationError,
} = require("../utils/documentVersion");

/** Saves only editable expense fields against the reviewed document version. */
const updateExpense = async (req, res) => {
  try {
    const existing = await Expense.findById(req.params.id);
    if (!existing) throw mutationError(404, "Expense not found");
    const changes = Object.fromEntries(
      ["name", "notes"]
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]]),
    );
    const saved = await withTripWrite(
      existing.tripId,
      req.user.id,
      async (session) => {
        const current = await Expense.findOne({
          _id: existing._id,
          tripId: existing.tripId,
        }).session(session);
        if (!current) throw mutationError(404, "Expense not found");
        return updateVersioned(
          current,
          req.body.expectedVersion,
          changes,
          session,
        );
      },
    );
    res.json(saved);
  } catch (error) {
    sendMutationError(res, error);
  }
};
```

For DELETE, use the same parent lookup and transactional child reread, then call
`await deleteVersioned(current, req.body.expectedVersion, session)`. For POST,
create the allowlisted record inside `withTripWrite` using the same session;
there is no `expectedVersion` for a record that does not exist yet.

Pass hydrated Mongoose documents to these helpers, not `.lean()` results. Use
the supplied session for all reads, saves, parent-reference updates, and cascades
participating in the transaction. MongoDB must support transactions; local
development requires a replica set.

Transaction callbacks can run more than once. Keep uploads, messages, and other
external effects outside them. For media, follow the existing trip-cover flow:
prepare/upload, commit the reference conditionally, clean up rejected replacements,
and remove the old media after a successful commit.

Audit every writer of the new entity, including background jobs and administrative
routes. Content updates must participate in the version protocol; a direct
`save()` or ID-only update can bypass it. `updateVersioned` validates the document
and commits with `findOneAndUpdate`, so do not rely on `save` middleware to perform
required update transformations. Derive those changes explicitly.

If creating/deleting the child changes an editable parent reference list, update
that list and increment the parent's public `version` in the same transaction,
as reservation routes do. Register the new child in the Trip deletion cascade in
[trip.js](../backend/models/trip.js), using its session, to prevent orphaned records.

These transaction and provider helpers are trip-specific. Entities without a Trip
parent can reuse `documentVersion.js`, but need their own authorization,
transaction boundaries, and frontend coordinator scope.

## 3. Expose a targeted read

Return `version` from every read/create/update response used to initialize an
editor. Preserve it in projections and serializers. Authenticate and authorize the
read independently of the write; a version is not an access token.

Provide a way to fetch just the selected document. Existing event and reservation
collection GETs accept an optional `id` filter while retaining their normal array
response shape. Scope that filter to its actual trip/itinerary and category.
An empty filtered array means the document is absent. A dedicated detail endpoint
is also suitable; define how its `404` should be handled by the refresh adapter.

The conflict response contains the saved document. Ensure its fields are safe for
the authorized editor to receive; adapt serialization if the new model contains
secrets or internal data. Hiding a field in the UI does not remove it from the API.

## 4. Register the frontend entity

The coordinator currently has explicit branches for each entity. A new kind
requires all of these integration points; there is no automatic registration.

| File                                                                                  | Required addition for an `expense` kind                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [queries/expenses.ts](../frontend/src/queries/) (new file)                            | Export the API record including `_id` and `version`, query keys, read hooks, and mutation hooks. Keep server data in React Query.                                                                                               |
| [queries/tripEditing.ts](../frontend/src/queries/tripEditing.ts)                      | Extend `DocumentKind`; add a branch in `refreshEditingDocument` to fetch and cache the selected expense. Extend `EditingTarget`/baseline metadata if extra routing information is needed.                                       |
| [TripEditingProvider.tsx](../frontend/src/pages/trip/editing/TripEditingProvider.tsx) | Add the new kind to the successful-write invalidation logic, including parent/list/derived views it actually changes. Review the existing public-feed condition rather than automatically invalidating it for a private entity. |
| [TripRefreshStatus.tsx](../frontend/src/pages/trip/editing/TripRefreshStatus.tsx)     | Map the new kind to its query key and extend the cached-data type. Carry any new target metadata through to its refresh key and Retry action.                                                                                   |
| [ConflictComparison.tsx](../frontend/src/pages/trip/editing/ConflictComparison.tsx)   | Review labels, nested value formatting, hidden metadata, and media previews for the new document.                                                                                                                               |
| [Trip.tsx](../frontend/src/pages/trip/Trip.tsx)                                       | Existing trip views already share the provider. Ensure any new editor is rendered beneath it. Preserve the provider's trip-ID key so navigation resets its session.                                                             |

Add the refresh branch before the current event/reservation fallback in
`refreshEditingDocument`; merely extending `DocumentKind` can otherwise route the
new kind through reservation logic.

The refresh adapter must cancel the relevant existing query, issue a real GET
regardless of cache freshness, and update its cache after the GET succeeds. For a
filtered array response, merge only the selected record into an existing list,
preserve siblings, and remove only that record if absent. Do not create a partial
collection cache containing just one result when the full list was never fetched.
Propagate network/access failures instead of treating them as deletion.

## Frontend helper reference

| Helper                                                      | Responsibility                                                                                                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VersionedDocument`                                         | Minimum baseline shape: `{ _id, version }`. Use the full entity record for editor values.                                                                                                                             |
| `EditingTarget` / `editingTargetKey(target)`                | Identify the document and any required routing/category metadata. The key scopes pending requests and refresh feedback to that document.                                                                              |
| `useTripEditing()`                                          | Read the nearest coordinator. Returns `null` outside an editable trip; mutation hooks should report that editing is unavailable.                                                                                      |
| `refreshEditingDocument(client, tripId, target)`            | Entity-specific GET and cache merge. Extend this adapter when registering a kind. Usually call the provider's `refresh` instead.                                                                                      |
| `editing.refresh(target)`                                   | Deduplicate concurrent reads of the same target and maintain its pending/error state. Returns the latest document or `undefined` for an absent filtered result.                                                       |
| `editing.prepare(open, target?)`                            | Call `open()` immediately, then refresh an existing target in the background. It catches refresh failures because the editor shows inline Retry feedback. Omitting the target just opens, suitable for creates.       |
| `changedValues(baseline, values)`                           | Build a patch of changed top-level values using serialized equality. Normalize optional form defaults first. Nested objects/arrays are whole values; this does not deep-merge them or provide field-level versioning. |
| `editing.write({ kind, baseline, draft, deleting?, send })` | Await a targeted refresh, compare versions, request explicit conflict resolution, and call `send(expectedVersion)`. Handle repeated backend races and invalidate affected caches after success.                       |
| `TripWriteCancelled`                                        | Signal a conflict choice or a concurrent local submission. `discarded: true` means close/discard the local draft; `false` means keep editing. Neither should produce an error toast.                                  |
| `TripRefreshStatus`                                         | Show delayed local refresh feedback, Retry, newer-version notices, and deleted-item notices for `kind` and `baseline`. It never replaces the draft.                                                                   |
| [useCachedQuery](../frontend/src/queries/useCachedQuery.ts) | Subscribe to an existing cache entry without issuing GETs or replacing its query function. Used by refresh status.                                                                                                    |
| [API transport helpers](../frontend/src/utils/api.ts)       | Use `getFromApi`, `postToApi`, `patchToApi`, and `deleteFromApi` for the shared authentication/error transport.                                                                                                       |

Inside the provider, `ask` creates the pending conflict-choice promise and
`choose` resolves it. They are private implementation details. Feature forms
should use `write`, not implement another conflict dialog or retry loop.

## 5. Wire the mutation hook and editor

After registering `expense`, the update mutation can follow this pattern in
`frontend/src/queries/expenses.ts`:

```ts
/** Saves intentional expense changes through the trip conflict coordinator. */
export const useSaveExpense = () => {
  const editing = useTripEditing();
  return useMutation({
    mutationFn: async ({
      baseline,
      values,
    }: {
      baseline: Expense;
      values: Pick<Expense, "name" | "notes">;
    }) => {
      if (!editing) throw new Error("Trip editing is unavailable.");
      const patch = changedValues(
        { ...baseline, notes: baseline.notes ?? "" },
        values,
      );
      return editing.write({
        kind: "expense",
        baseline,
        draft: patch,
        send: (expectedVersion) =>
          patchToApi<Expense>(`/expense/${baseline._id}`, {
            ...patch,
            expectedVersion,
          }),
      });
    },
  });
};
```

Import `useMutation` from React Query, `patchToApi` from shared transport, and
`changedValues`/`useTripEditing` from `tripEditing`. Export the `Expense` interface
from the entity query module and reuse it in the form.

The `send` callback must use its argument, not `baseline.version`: an explicit
"Keep my draft" choice advances the version being submitted. Do not retry a
`409` automatically with the returned version. `write` owns that decision.

For deletion, pass `deleting: true`, `draft: {}`, and use:

```ts
send: (expectedVersion) => deleteFromApi(`/expense/${baseline._id}`, {
  data: { expectedVersion },
}),
```

For creation, use an allowlisted POST through the entity mutation hook, then
update/invalidate the relevant entity and parent queries in `onSuccess`.
Do not invent a baseline or call `write` for a new document. For multipart updates,
append `String(expectedVersion)` and explicitly validate/convert the decimal
field on the backend before passing it to the integer-only helpers.

When opening an existing editor, capture the clicked record and initialize a
separate draft inside the callback:

```ts
void editing?.prepare(
  () => {
    setBaseline(expense);
    setDraft({ name: expense.name, notes: expense.notes ?? "" });
    setOpen(true);
  },
  { kind: "expense", id: expense._id },
);
```

Pass the captured baseline to the save mutation and to the modal's status slot:

```tsx
status={<TripRefreshStatus kind="expense" baseline={baseline} />}
contentDisabled={mutation.isPending}
dismissDisabled={mutation.isPending}
```

Keep typing enabled while the opening GET runs. Once Save is pressed, disable
the submitted form and duplicate submit/dismiss actions while the mutation waits
for revalidation and conflict resolution. The provider blocks the screen only
during the actual send. Its local active-write guard is scoped to the mounted
provider; it is not a cross-tab or cross-user lock.

Do not copy refreshed query data into the draft/baseline with an effect or mutate
nested baseline objects through shared references. A refresh should not discard
typing or silently acknowledge a version the user has not reviewed. Normalize
empty form values consistently; use API-supported explicit clears such as `null`
or `''` instead of relying on JSON to transmit `undefined`.

On successful submission, close the editor. In its catch block:

```ts
if (error instanceof TripWriteCancelled) {
  if (error.discarded) setOpen(false);
  return;
}
// Display the normal failure feedback and keep the draft open.
```

"Use saved version" refreshes that document and throws cancellation with
`discarded: true`. "Return to editing" preserves the draft and original baseline.
"Keep my draft" submits the intended patch against the displayed saved version;
a further server race prompts again. Deletions use the same flow with an explicit
"Delete saved version" confirmation.

## 6. Verify the integration

Extend the existing test patterns rather than mocking away the version predicate:

- [Backend integration tests](../backend/test/documentVersion.integration.test.js):
  use the isolated replica set to prove same-document concurrent saves produce
  one success and one conflict, different documents both succeed, stale deletes
  fail, no-ops preserve versions, access checks hold, and parent deletion leaves
  no orphan. Cover missing/invalid counters, targeted reads, and legacy migration.
- [Refresh unit tests](../frontend/test/queries/tripEditing.test.ts): assert only
  the relevant endpoint is fetched, siblings are preserved, absence removes only
  the selected record, failures preserve the cache, and a single result does not
  create a partial list cache.
- [Browser conflict tests](../frontend/cypress/e2e/trip-concurrency.cy.ts): verify
  immediate opening, typing through slow GETs, inline retry, preserved drafts,
  all conflict choices, repeated races, and that unrelated endpoint failures do
  not block saving. Keep fixture data separate and use stable `data-cy` tags.

Run the relevant backend tests from `backend/` with `node --test` and selected
test paths. From `frontend/`, run `npm run typecheck`, `npm run lint`,
`npm run test`, and the affected Cypress specs. Format changed files using
Prettier. Follow the repository validation instructions before committing or
pushing.
