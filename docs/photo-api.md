# Trip photo backend

Album photos are private trip resources. Owners/editors can upload and delete;
viewers can list and fetch content. A public trip does **not** expose its album.
All endpoints require the existing `Authorization: Bearer <token>` header.
The album picker sends originals sequentially to this API; phone-only formats
are decoded on the server rather than through browser canvas.

## Processing policy

- Exactly one `image` file per multipart request; no extra form fields.
- Input: JPEG, PNG, HEIC/HEIF (HEVC), WebP, or AVIF, non-empty, at most
  **16 MiB** (16,777,216 bytes).
- Decode limit: **60,000,000 pixels**, including 48 MP phone photos.
  Animated/multi-frame images are rejected. RAW/DNG, GIF, TIFF, and SVG are not supported.
- HEIC uses a bundled libheif decoder in a worker with a 30-second deadline;
  no system HEVC codec is required. Dimensions are checked before RGBA allocation.
  HEIF rotation/mirroring is applied by libheif, not applied again by Sharp.
- Live/Motion Photos retain only the uploaded still image, not accompanying video.
- Actual decoded format is checked, not the filename or client MIME type.
- Apply EXIF orientation; resize within **2560 × 2560**, preserving aspect ratio
  and never enlarging; encode **once** to WebP at quality **82**.
- Strip embedded metadata, including EXIF/GPS. PNG transparency is preserved.
- Store only the resulting WebP. Originals are discarded. There is **no output
  byte cap, target-size loop, or quality retry**.

## Endpoints

### POST `/trip/:tripId/photos`

```sh
curl -X POST "$API/trip/$TRIP_ID/photos" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'image=@holiday.jpg'
```

Returns `201` with `{ "photo": { ... } }`. Public metadata fields:
`id`, `trip`, `uploadedBy`, `originalName`, `contentType`, `byteLength`,
`width`, `height`, `createdAt`, `contentUrl`.

The original name is informational only. It is not a storage path or download
header. `contentType`, `byteLength`, and dimensions describe the stored WebP.
Storage IDs and internal deletion status are not exposed.

### GET `/trip/:tripId/photos?limit=30&cursor=...`

Returns `{ "photos": [...], "nextCursor": "..." | null }`.
`limit` is 1–100, default 30. Pass the opaque `nextCursor` back unchanged.
Ordering is descending creation time, with ID as a tie-breaker. This is not a
snapshot: uploads/deletes between requests can change the album.

### GET `/trip/:tripId/photos/:photoId/content`

Returns authenticated WebP bytes with `Cache-Control: no-store` and
`X-Content-Type-Options: nosniff`. Every request rechecks trip membership and
matches the photo to the URL's trip. No public/static GridFS route is exposed.
Range requests and thumbnail variants are not implemented.

### DELETE `/trip/:tripId/photos/:photoId`

Returns `204`, including when the photo is already absent. A matching photo is
hidden first (`status: deleting`), its GridFS file is removed, then its metadata
is deleted. A storage failure returns `500` and leaves retryable metadata.
Repeating the request safely retries cleanup. Owners/editors may delete any
photo in their trip, regardless of who uploaded it.

### Errors

- `400`: invalid IDs/cursor/limit, missing or malformed multipart data,
  unsupported/corrupt image, excessive pixel count, unexpected fields/files.
- `401`: missing/invalid authentication.
- `403`: a member lacks edit permission.
- `404`: trip inaccessible/missing or readable photo absent.
- `413`: input exceeds 16 MiB.
- `503`: both per-process upload slots are occupied; `Retry-After: 5`.
- `500`: storage/database failure; internal details are logged, not returned.

## Architecture and failure handling

`Photo` stores metadata and references a file in the `tripPhotos` GridFS bucket.
GridFS uses `tripPhotos.files` and `tripPhotos.chunks`; the driver manages chunks.
The metadata index supports trip/status filtering and cursor ordering.

The route authenticates and checks edit access **before** buffering multipart
bytes. Two upload slots per Node process bound parsing, processing, and storage
work. A full server rejects requests rather than building an unbounded queue.
Size/pixel caps still require deployment-appropriate memory sizing; two large
image decodes can consume substantial memory. For a lower-memory environment,
reduce the slot count. Each additional server process has its own slots.
Configure a reverse proxy request-body limit above 16 MiB to allow multipart
overhead, plus request timeouts and per-user/IP upload rate limits. Those
infrastructure controls and per-trip storage quotas are not implemented here.

GridFS writes and Photo writes are not one transaction. Upload waits for the
GridFS stream to finish, rechecks permission, creates metadata, and rechecks
permission again. Failures compensate by deleting the stored file. Failed
compensation is logged for reconciliation. Interrupted GridFS writes attempt
an abort. There is a small unavoidable cross-operation race with trip deletion;
stale orphan reconciliation is the fallback, not a claim of atomicity.

A client timeout after a successful commit can cause a duplicate when retried.
This version does not implement idempotency keys or content deduplication.

The Trip `findOneAndDelete` hook removes album files/metadata before removing
the trip; a storage failure stops deletion so it can be retried. This hook
covers the current `findByIdAndDelete` path, **not** raw collection deletes or
`deleteMany`. Administrative deletion tools must use the same cleanup service.

## Maintenance

Run against the intended database (loads `backend/.env` when run from backend):

```sh
cd backend
node scripts/reconcilePhotos.js
```

Schedule this periodically. With a 24-hour grace period it retries stale
`deleting` records, deletes photos referencing deleted trips, and removes
completed GridFS files that have no Photo record. It does not delete a recent
unreferenced file that might still be completing its metadata write.

Chunks left by a process crash before GridFS creates a files document need a
separate **offline** maintenance procedure: stop uploads, find chunk `files_id`
values absent from `tripPhotos.files`, and remove those chunks. Do not run a
naive online orphan-chunk sweep: active uploads also have chunks before their
files document exists. Metadata referencing a missing file returns `404` and
needs investigation/restoration; reconciliation does not destroy that record.

The untested branch's former `photoString` schema is replaced, not migrated.
If any prototype Photo documents exist in a database, export/migrate them
before enabling this version; old string records are not valid new photos.

## Validation

`node --test test/photo*.test.js` exercises real Sharp processing and real HTTP
multipart/auth behavior with mocked MongoDB/GridFS boundaries. Storage tests
exercise stream completion/abort, missing-file retries, trip cleanup, and
reconciliation. These tests do not replace a deployment smoke test against
real MongoDB (upload, reload/list, fetch bytes, delete, delete trip).
