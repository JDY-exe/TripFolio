# Reservation and itinerary consistency

Creating, updating, and deleting a reservation uses a MongoDB transaction. Its
linked itinerary events and the trip's reservation references commit together or
not at all. A reservation may be created before the itinerary has been opened;
the transaction initializes the itinerary using the trip dates when needed.

All itinerary initialization entry points reuse the same helper and serialize
initialization through a write to the parent trip. Concurrent requests therefore
reuse one itinerary without requiring a new unique index on existing data.
Existing duplicate itineraries are not merged by this change. Explicit itinerary
creation returns the existing itinerary if one is already present; use PATCH to
change its fields.

Reservations support typed itinerary actions with explicit time slots: hotel
check-in/check-out and rental pickup/return. Reservation edits synchronize event
title and linked location; planned slots and itinerary notes belong to the event.
Flight journey edits also update flight-event times. Location changes clear stale
coordinates. Unrelated reservation edits never recreate explicitly removed events.

See [typed itinerary events](../docs/typed-itinerary-events.md) for the action API,
clean-slate schema, and verified backup/reset/restore commands. The reset script
is inventory-only by default and never runs automatically. Hotel/rental bookings
without selected actions create no events; flight bookings create a typed journey
event. Legacy event conversion and compatibility readers have been removed.

These operations require a replica set (MongoDB Atlas or a local single-node
replica set), just like trip sharing. There is no non-transactional fallback.
A lost HTTP response can still make a committed create ambiguous; this API does
not provide idempotency keys.

# Backend tests

Run `npm test` from `backend`. Route tests start isolated HTTP servers on ephemeral
ports and stub persistence; they do not require a server on port 5000 or a live
database. Transaction contract tests verify session propagation and staged
commit/abort behavior, but do not replace testing against a real MongoDB replica
set before deployment.

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
