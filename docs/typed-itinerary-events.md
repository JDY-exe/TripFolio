# Typed itinerary events and reservation actions

## Behavior

Every itinerary event requires `startTime` and `endTime`. Hotel and rental forms
use three steps: **Details** (identity, locations, dates), **Booking** (optional
cost, confirmation number, and booking-only notes), and **Itinerary** (action
selection and planned slots). Back preserves drafts; only the final Save persists.

Selected actions require times. The end defaults to 30 minutes after the entered
start and remains editable. Unchecked actions create no events. Hotels and rentals
can have zero, one, or two boundary actions; a stay or rental period is not itself
an itinerary event. Action locations come from Details, not a second location form.

`eventType` is required and must be one of `activity`, `restaurant`,
`hotel_checkin`, `hotel_checkout`, `rentalcar_pickup`, `rentalcar_return`, or
`flight`. New ordinary events default to `activity`. There are no legacy flags,
restaurant-boolean readers, missing-type inference, or duration-event conversion.
`reservationMade` remains independent restaurant booking status. Place
classification changes Activity/Restaurant, never an explicit logistics type.

Hotels support place search or a custom address. Rentals have independent pickup
and return locations with a copy-pickup-location shortcut. Place IDs are stored on
the booking and copied to its events; coordinates use the existing location
endpoint. Flights retain one journey event and airport-local time semantics.

Bookings own event title and linked location. Events own planned slots and personal
notes. Booking-note edits never overwrite itinerary notes. Changing booking dates
requires explicit action slots for existing hotel/rental actions; forms require
review of the new dates. Unrelated reservation edits refresh metadata but never
recreate removed actions. Flight journey edits update existing flight-event times.

Deleting an event leaves the booking intact. Deleting a booking removes its events
transactionally. Mutations refresh both reservation and event query caches. Public
event responses omit reservation IDs and do not expose booking cost/confirmation.

## API

Logistics POST/PATCH endpoints accept an authoritative action selection:

```json
{
  "itineraryActions": [
    {
      "eventType": "hotel_checkin",
      "startTime": "2030-04-01T15:00:00.000Z",
      "endTime": "2030-04-01T15:30:00.000Z"
    },
    {
      "eventType": "hotel_checkout",
      "startTime": "2030-04-05T10:00:00.000Z",
      "endTime": "2030-04-05T10:30:00.000Z"
    }
  ]
}
```

Omitted action types are removed; `[]` means no entries. POST without this field
creates no hotel/rental events. Flight POST without it creates one explicitly typed
journey event from the flight summary. Omitting the field on PATCH leaves the
selection untouched. POST returns `{ reservation, events }`.

`GET /logistics/:category/:id/events` checks trip access and returns linked entries.
Forms wait for fresh data before initializing edits; load failures cannot silently
erase a selection. General event creation accepts compatible `eventType` and
`reservation` IDs for itinerary-first insertion. Cross-trip links are rejected.
Event PATCH cannot reassign booking/itinerary IDs or overwrite booking-owned
metadata. Duplicate actions return 409.

Writes serialize through the parent trip within a MongoDB transaction. The partial
unique `reservation_event_action` index enforces one typed action per booking; it
is created normally with the clean schema, not through a migration. A replica set
is required. There is no non-transactional fallback.

## Clean-slate reset and backup

The old event-type migration has been removed. This schema expects fresh planning
data. Do not deploy it over old records and expect automatic conversion.

`backend/scripts/resetPlanningData.js` reads `MONGO_URI` from the environment or
`backend/.env`. With no arguments it only inventories the target:

```sh
node backend/scripts/resetPlanningData.js
```

After confirming the target and stopping all application writers:

```sh
node backend/scripts/resetPlanningData.js --apply
```

Before any deletion it saves raw events, reservations, original trip reservation
reference fields, and photo event-link fields under
`~/.local/share/TripFolio/backups/planning/<timestamp>/`. Canonical Extended JSON
preserves BSON types, dates, IDs, and absent fields. Private files are durably
written and re-read; SHA-256, counts, and serialization round-trip checks must pass
before writes proceed. Backups contain private data, but not the connection URI.
Keep a secure off-machine copy for protection against local disk loss.

Reset transactionally deletes events/reservations, clears trip reservation
references, and clears photo links to removed events. It preserves users, trips,
itineraries, photo records, and stored photo files. A commit marker and post-reset
inventory report the outcome. Pause writers throughout the maintenance window;
new planning data discovered afterward is reported, not silently deleted again.

### Restore

Stop application writers and use the backup directory printed by the reset:

```sh
node backend/scripts/resetPlanningData.js --restore /absolute/path/to/backup
```

Restore verifies checksums, BSON data, counts, and the database/server identity.
It refuses to overwrite new planning records, missing original trips/photos, or
new photo event links. All restored documents and trip/photo reference fields
commit together. Only reference fields are restored on trips/photos, preserving
unrelated changes. Back up any new work before deliberately clearing it for a
restore. An old-data restore also requires the matching older application version;
the simplified application intentionally does not support legacy event records.

Backup round-trip tests verify serialization; transaction contract tests do not
replace a full disaster-recovery drill on an isolated replica-set database.

## Verification

- `npm --prefix backend test`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run format`
- `npm --prefix frontend run lint`
- `npm --prefix frontend test`
- `npm --prefix frontend run e2e:ci`

Tests cover atomic multi-action writes, required slots, invalid selections,
metadata/notes ownership, deletion without recreation, BSON backup integrity,
place selection, cache freshness, linked-reservation navigation, and type badges.
Real concurrent inserts and rollback should also be exercised on a staging replica
set before production deployment.
