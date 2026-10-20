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
