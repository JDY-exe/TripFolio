# Trip invitations

`POST /trip/:id/share` requires authentication and an owner or editor role.
Send `{ "recipientIds": ["<user-id>", "<another-user-id>"] }`, including for a
single recipient. The array must be non-empty, contain valid user IDs, and
contain no duplicates. The response is `201` with `{ message, invitations }`.

The batch creates all invitations or none. A missing profile, existing trip
member, or existing pending invitation rejects the entire batch. Declined
invitations do not prevent reinviting a user. Duplicate-key races and write
failures abort the transaction as well.

This endpoint uses a MongoDB transaction. MongoDB Atlas Free clusters support
this; local MongoDB must run as a replica set, including a single-node replica
set, rather than a standalone server. No non-transactional fallback is used.

The transaction covers invitation creation only. Creating the trip, itinerary,
and cover are separate operations. A failed invitation batch leaves the trip
saved. A lost HTTP response can leave the client unsure whether the whole batch
committed; requests are not automatically retried.

# Concurrent trip editing

For helper APIs and a walkthrough of connecting a new backend/frontend entity,
see [Adding an entity to concurrent trip editing](../docs/versioned-entities.md).

Trip, Itinerary, Event, and Reservation records expose one server-owned integer
`version`, starting at `0`. PATCH requests send editable changes and
`expectedVersion`. DELETE requests send `{ "expectedVersion": 0 }` in their JSON
body. Cover uploads include `expectedVersion` as a decimal multipart field.
Updates compare ID and version atomically and increment the version only when
content changes. Different documents save independently; changing any editable
field of the same document invalidates an earlier editor's version.

Missing versions return `428`, invalid versions return `400`, and stale versions
return `409` with `{ "code": "VERSION_CONFLICT", "current": { ... } }`.
Deleted resources return `404`. Clients must show conflicts and obtain an explicit
choice before retrying with the displayed current version. Refreshing an open
editor must never replace its draft or original baseline version.

Membership additions and reservation-list changes also advance the Trip version.
Internal parent lifecycle locks and derived coordinate caching do not advance the
user-facing content version. Child writes and cascading deletion use transactions
to prevent orphaned records. Trip deletion intentionally deletes its child records;
its version precondition protects the reviewed Trip document, not each child.

The frontend opens write dialogs immediately from cached records. Editors refresh
only the document being changed, both on opening and before saving.
Event and reservation collection GETs accept an optional `id` filter; filtered
responses retain their usual array shape and only that record is merged into the
frontend cache. Creates skip revalidation because no existing document is being
changed. Post-save invalidation targets the affected entities and related views.
Background reads never replace the draft or its original version. Slow refreshes
and failures show local status and retry feedback inside the editor. Submissions
await revalidation and retain server-side version checks. No snapshot endpoint is added.
Query cache invalidation after successful writes keeps all mounted consumers current.

## Migrating legacy versions

Pause application writes before migration and keep them paused until the matching
backend and frontend are deployed. From `backend/`:

```sh
node scripts/migrateDocumentVersions.js
node scripts/migrateDocumentVersions.js --apply
```

The script loads `backend/.env` and uses `MONGO_URI`. The default is a dry run.
`--apply` sets missing persisted versions to `0` in the four collections, without
changing timestamps, contents, existing versions, or `__v`. It reports per-collection
counts and rejects invalid existing versions before making any writes. It is safe
to rerun after success or partial failure. Old clients cannot perform versionless
updates after deployment. This migration is not run automatically on startup.

The document concurrency integration tests start an isolated MongoDB replica set
through `mongodb-memory-server`; the first run downloads a local MongoDB binary.
Existing user-route tests additionally expect a test backend on port 5000.
