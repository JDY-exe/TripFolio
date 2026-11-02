# Trip highlight collage ideas

These are automatically generated recap formats, not a template marketplace or
an open-ended design editor. TripFolio should choose photos, layout, and short
labels, then let the user browse, download, or share an individual image.

**Selected first format:** #2, the daily recap.
See [the implementation plan](daily-recap-collage-plan.md).
The remaining formats are backlog ideas, not committed scope.

## Shared product direction

- Make decisions for the user: no compulsory photo selection, style choice,
  slide arrangement, or export settings.
- Start with one consistent visual style and portrait 4:5 images.
- Generate only formats supported by the trip's actual content. Never fill an
  empty collage with duplicates, third-party place photos, or invented stats.
- Adapt layouts to the number and orientation of available photos.
- Generate multiple images when content warrants it, but share one at a time.
- Preview the actual export. Always offer Download; offer native file sharing
  where supported. No requirement for an Instagram login or direct publishing.
- Share the image file, not merely a link to the TripFolio page. Instagram's
  availability and supported destinations depend on the phone/app/browser.
- Sharing is an intentional export of private album content, not a change to
  trip visibility. Do not claim to know that a post was published.
- Keep maps and statistics optional future formats rather than adding settings
  and financial disclosures to the first photo collage.

## 1. Dining recap — "A taste of [destination]"

**Purpose:** collect a trip's meals and restaurant memories.

- Content: uploaded photos associated with restaurant events.
- Composition: one large photo plus two or three smaller supporting images.
- Labels: verified destination/trip name and restaurant names when available.
- Start with one recap per trip; consider per-day recaps only for larger sets.
- Dependency: usable photo-to-event links and the existing restaurant flag.
- Important limitation: a restaurant-linked photo may show people or a building,
  not food. Without image recognition or explicit food tagging, describe this
  as a dining recap rather than promising automatic dish identification.
- Proximity alone can suggest a link, but should not confidently assign a meal
  or a named restaurant when several nearby locations are plausible.

## 2. Daily recap — "Today in [destination]"

**Purpose:** create something shareable during the trip, not only at its end.

- Content: one uploaded photo per photographed event on a given day.
- Composition: two to four photos in event order, with a single-photo fallback.
- Labels: date and brief event/place titles; use a destination only when known.
- More than four events create additional individually shareable images.
- Dependency: reliable photo-to-event links; use the event's itinerary day.
  Capture dates are an alternative input for a future unlinked-photo format,
  but upload dates are not capture dates.
- For past days, use date-specific wording instead of calling the recap today.
- **First implementation:** [Daily recap plan](daily-recap-collage-plan.md).

## 3. Digital postcard — "Greetings from [destination]"

**Purpose:** produce a useful export even when an album has only one good photo.

- Content: one uploaded landscape, landmark, or other representative photo.
- Composition: a mostly unobstructed large photo with a narrow caption area.
- Labels: known destination or trip name, dates, and optionally trip duration.
- Do not force one photo into several repeated collage cells.
- Dependency: album photos and trip details; event links are not essential.
- Candidate fallback for sparse albums and an independently useful later format.

## 4. Single-experience recap — "An afternoon at [place]"

**Purpose:** give one memorable stop more room than a whole-day recap allows.

- Content: several uploaded photos linked to one event or verified location,
  such as a museum, hike, market, or beach.
- Composition: one wide establishing photo above two supporting images.
- Labels: event/place name and date. Use time-of-day language only when supported
  by the event times; otherwise use neutral wording such as "At [place]".
- Generate only when the stop has enough distinct photos.
- Dependency: photo-to-event links; location grouping beyond one event is later work.

## 5. Whole-trip overview — "[Trip name], in moments"

**Purpose:** a concise recap for sharing after the trip.

- Content: a representative spread across different days and events, not simply
  the newest uploaded images.
- Composition: a four- or six-photo grid with little additional decoration.
- Labels: trip name and dates.
- Start with one overview rather than reproducing the entire album as slides.
- A basic version can work without GPS or expense data. Reliable day/event
  diversity requires event links or preserved capture dates; upload times do
  not establish trip chronology.

## Later exploration: places and statistics

These were discussed as future possibilities, not part of the daily recap MVP.

### Trip places / journey map

- A map of selected trip places, potentially paired with a few photo thumbnails.
- Current coordinates belong to itinerary events, not uploaded photos.
- Label planned places truthfully; only claim visits when supported by reliable
  photo associations or explicit visit records.
- Connecting points does not establish the actual route travelled.
- Any exported basemap must support image export and retain required attribution.
- Prefer broad place labels; do not disclose exact photo GPS by default.

### By the numbers

Potential statistics, subject to reliable source data and clear definitions:

- Trip days/nights, derived from trip dates. A planned duration is not proof a
  trip was completed.
- Photographed events/places, counting reliable associations rather than all
  scheduled itinerary events as visits.
- Estimated distance between known stops, explicitly labelled as an estimate
  with a documented method, not actual tracked mileage.
- Recorded booking costs, distinguished from complete trip spending. The
  current ledger is a placeholder and reservation costs alone are incomplete;
  currency, coverage, refunds, and split expenses need handling first.

Spending should be opt-in if ever exported. Avoid inferring visited countries,
walking distances, transport modes, savings, or complete spending from data
that does not establish those facts.

## Deferred controls

If real usage later shows a need, consider a single **Replace photo** action
before expanding into crop editing, caption authoring, style selection, or
manual slide arrangement. None is required for the initial daily recap.
