import feature from '../fixtures/owned-features.json';
import fixture from '../fixtures/trip-concurrency.json';
import { visitOwnedTrip } from '../support/ownedTrip';

/** Opens description editing with mutable, versioned server state.
 * @returns Mutable records used to simulate other users saving the itinerary.
 */
const openDescription = () => {
  const state = { itinerary: { ...feature.itinerary, version: 0 }, saves: 0 };
  visitOwnedTrip();
  cy.intercept({ method: 'GET', pathname: '/itinerary' }, (request) =>
    request.reply({ body: state.itinerary }),
  ).as('refreshItinerary');
  cy.intercept(
    { method: 'PATCH', pathname: `/itinerary/${feature.itinerary._id}` },
    (request) => {
      state.saves++;
      expect(request.body.expectedVersion).to.eq(state.itinerary.version);
      state.itinerary = {
        ...state.itinerary,
        description: request.body.description,
        version: state.itinerary.version + 1,
      };
      request.reply({ body: state.itinerary });
    },
  ).as('saveItinerary');
  cy.get('[data-cy="description-edit"]').click();
  cy.get('[data-cy="description-input"]')
    .clear()
    .type(fixture.draftDescription);
  return state;
};

describe('document version conflicts', () => {
  it('edits and saves an event without calling unrelated refresh endpoints', () => {
    let event = { ...feature.event };
    visitOwnedTrip(undefined, { events: () => [event] });
    cy.get(`[data-cy="event-card-${event._id}"]`).should('exist');
    cy.intercept(
      { method: 'GET', pathname: '/itinerary' },
      { statusCode: 503 },
    ).as('unrelatedItinerary');
    cy.intercept(
      { method: 'GET', pathname: '/logistics/*' },
      { statusCode: 503 },
    ).as('unrelatedReservations');
    cy.intercept(
      { method: 'GET', pathname: `/trip/${feature.trip._id}` },
      { statusCode: 503 },
    ).as('unrelatedTrip');
    cy.intercept({ method: 'GET', pathname: '/event' }, (request) => {
      request.reply({ body: [event] });
    }).as('eventRead');
    cy.intercept(
      { method: 'PATCH', pathname: `/event/${event._id}` },
      (request) => {
        expect(request.body.expectedVersion).to.eq(event.version);
        event = { ...event, ...request.body, version: event.version + 1 };
        request.reply({ body: event });
      },
    ).as('targetedSave');
    cy.get(`[data-cy="edit-event-${event._id}"]`).click({ force: true });
    cy.wait('@eventRead').its('request.query.id').should('eq', event._id);
    cy.get('[data-cy="event-title"]').clear().type(fixture.draftTitle);
    cy.get('[data-cy="event-save"]').click();
    cy.wait('@targetedSave');
    cy.get('[data-cy="event-title"]').should('not.exist');
    cy.get('@unrelatedItinerary.all').should('have.length', 0);
    cy.get('@unrelatedReservations.all').should('have.length', 0);
    cy.get('@unrelatedTrip.all').should('have.length', 0);
  });

  it('opens from cached values and preserves the baseline when unseen changes arrive', () => {
    visitOwnedTrip();
    cy.get('[data-cy="description-edit"]').should('be.visible');
    cy.intercept(
      { method: 'GET', pathname: '/itinerary' },
      {
        body: {
          ...feature.itinerary,
          description: fixture.savedDescription,
          version: 1,
        },
      },
    ).as('backgroundRefresh');
    cy.get('[data-cy="description-edit"]').click();
    cy.get('[data-cy="description-input"]').should(
      'have.value',
      feature.itinerary.description,
    );
    cy.wait('@backgroundRefresh');
    cy.get('[data-cy="trip-refresh-changed"]').should('be.visible');
    cy.get('[data-cy="description-input"]').should(
      'have.value',
      feature.itinerary.description,
    );
    cy.get('[data-cy="description-input"]')
      .clear()
      .type(fixture.draftDescription);
    cy.get('[data-cy="description-save"]').click();
    cy.get('[data-cy="trip-conflict-dialog"]').should(
      'contain.text',
      fixture.savedDescription,
    );
  });

  it('lets the user type and cancel a modal while its refresh is still pending', () => {
    let release: (() => void) | undefined;
    visitOwnedTrip(undefined, { events: () => [feature.event] });
    cy.get(`[data-cy="event-card-${feature.event._id}"]`).should('exist');
    cy.intercept(
      { method: 'GET', pathname: '/event' },
      (request) =>
        new Promise<void>((resolve) => {
          release = () => {
            request.reply({ body: [feature.event] });
            resolve();
          };
        }),
    ).as('slowRefresh');
    cy.get(`[data-cy="edit-event-${feature.event._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="event-title"]')
      .should('be.enabled')
      .clear()
      .type(fixture.draftTitle);
    cy.get('[data-cy="trip-refresh-pending"]').should('be.visible');
    cy.contains('[role="dialog"]', 'Loading').should('not.exist');
    cy.get('[data-cy="event-cancel"]').click();
    cy.get('[data-cy="event-title"]').should('not.exist');
    cy.then(() => {
      expect(release).to.be.a('function');
      release?.();
    });
    cy.wait('@slowRefresh');
    cy.get('[data-cy="event-title"]').should('not.exist');
  });

  it('preserves typing when a slow modal refresh finishes with a newer document', () => {
    let release: (() => void) | undefined;
    visitOwnedTrip(undefined, { events: () => [feature.event] });
    cy.get(`[data-cy="event-card-${feature.event._id}"]`).should('exist');
    cy.intercept(
      { method: 'GET', pathname: '/event' },
      (request) =>
        new Promise<void>((resolve) => {
          release = () => {
            request.reply({
              body: [
                { ...feature.event, title: fixture.savedTitle, version: 1 },
              ],
            });
            resolve();
          };
        }),
    ).as('slowEvents');
    cy.get(`[data-cy="edit-event-${feature.event._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="event-title"]').clear().type(fixture.draftTitle);
    cy.get('[data-cy="trip-refresh-pending"]').should('be.visible');
    cy.then(() => release?.());
    cy.wait('@slowEvents');
    cy.get('[data-cy="trip-refresh-changed"]').should('be.visible');
    cy.get('[data-cy="event-title"]').should('have.value', fixture.draftTitle);
  });

  it('reuses an opening refresh when saving and blocks only the submitted form during the GET', () => {
    let event = { ...feature.event };
    let release: (() => void) | undefined;
    let opening = true;
    let reads = 0;
    visitOwnedTrip(undefined, { events: () => [event] });
    cy.get(`[data-cy="event-card-${feature.event._id}"]`).should('exist');
    cy.intercept({ method: 'GET', pathname: '/event' }, (request) => {
      reads++;
      if (!opening) {
        request.reply({ body: [event] });
        return;
      }
      return new Promise<void>((resolve) => {
        release = () => {
          opening = false;
          request.reply({ body: [feature.event] });
          resolve();
        };
      });
    }).as('openingRefresh');
    cy.intercept(
      { method: 'PATCH', pathname: `/event/${feature.event._id}` },
      (request) => {
        expect(request.body.expectedVersion).to.eq(0);
        event = { ...event, ...request.body, version: 1 };
        request.reply({ body: event });
      },
    ).as('saveAfterRefresh');
    cy.get(`[data-cy="edit-event-${feature.event._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="event-title"]').clear().type(fixture.draftTitle);
    cy.get('[data-cy="event-save"]').click();
    cy.get('[data-cy="event-title"]').should('be.disabled');
    cy.contains('[role="dialog"]', 'Loading').should('not.exist');
    cy.then(() => {
      expect(reads).to.eq(1);
      release?.();
    });
    cy.wait('@saveAfterRefresh');
    cy.get('[data-cy="event-title"]').should('not.exist');
  });

  it('keeps an opened editor usable after refresh failure and offers inline retry', () => {
    visitOwnedTrip(undefined, { events: () => [feature.event] });
    cy.get(`[data-cy="event-card-${feature.event._id}"]`).should('exist');
    cy.intercept(
      { method: 'GET', pathname: '/event' },
      { statusCode: 503, body: { message: 'Refresh unavailable' } },
    );
    cy.get(`[data-cy="edit-event-${feature.event._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="trip-refresh-error"]').should(
      'contain.text',
      'Refresh unavailable',
    );
    cy.get('[data-cy="event-title"]').clear().type(fixture.draftTitle);
    cy.intercept(
      { method: 'GET', pathname: '/event' },
      { body: [feature.event] },
    ).as('retryRefresh');
    cy.get('[data-cy="trip-refresh-retry"]').click();
    cy.wait('@retryRefresh');
    cy.get('[data-cy="trip-refresh-error"]').should('not.exist');
    cy.get('[data-cy="event-title"]').should('have.value', fixture.draftTitle);
  });

  it('refreshes before save, compares the draft, and retries only after an explicit choice', () => {
    const state = openDescription();
    cy.then(() => {
      state.itinerary = {
        ...state.itinerary,
        description: fixture.savedDescription,
        version: 1,
      };
    });
    cy.get('[data-cy="description-save"]').click();
    cy.get('[data-cy="trip-conflict-dialog"]')
      .should('contain.text', fixture.savedDescription)
      .and('contain.text', fixture.draftDescription);
    cy.then(() => expect(state.saves).to.eq(0));
    cy.get('[data-cy="conflict-draft"]').click();
    cy.wait('@saveItinerary')
      .its('request.body.expectedVersion')
      .should('eq', 1);
    cy.get('[data-cy="description-input"]').should('not.exist');
    cy.contains(fixture.draftDescription).should('be.visible');
  });

  it('uses the saved version without writing the draft', () => {
    const state = openDescription();
    cy.then(() => {
      state.itinerary = {
        ...state.itinerary,
        description: fixture.savedDescription,
        version: 1,
      };
    });
    cy.get('[data-cy="description-save"]').click();
    cy.get('[data-cy="conflict-saved"]').click();
    cy.get('[data-cy="description-input"]').should('not.exist');
    cy.contains(fixture.savedDescription).should('be.visible');
    cy.then(() => expect(state.saves).to.eq(0));
  });

  it('returns to editing with the draft and original baseline preserved', () => {
    const state = openDescription();
    cy.then(() => {
      state.itinerary = {
        ...state.itinerary,
        description: fixture.savedDescription,
        version: 1,
      };
    });
    cy.get('[data-cy="description-save"]').click();
    cy.get('[data-cy="conflict-edit"]').click();
    cy.get('[data-cy="description-input"]').should(
      'have.value',
      fixture.draftDescription,
    );
    cy.get('[data-cy="description-save"]').click();
    cy.get('[data-cy="trip-conflict-dialog"]').should('be.visible');
    cy.then(() => expect(state.saves).to.eq(0));
  });

  it('prompts again if a save races with conflict resolution', () => {
    const state = openDescription();
    cy.then(() => {
      state.itinerary = {
        ...state.itinerary,
        description: fixture.savedDescription,
        version: 1,
      };
    });
    cy.intercept(
      { method: 'PATCH', pathname: `/itinerary/${feature.itinerary._id}` },
      (request) => {
        expect(request.body.expectedVersion).to.eq(1);
        state.itinerary = {
          ...state.itinerary,
          description: fixture.latestDescription,
          version: 2,
        };
        request.reply({
          statusCode: 409,
          body: {
            code: 'VERSION_CONFLICT',
            message: 'Changed',
            current: state.itinerary,
          },
        });
      },
    );
    cy.get('[data-cy="description-save"]').click();
    cy.get('[data-cy="conflict-draft"]').click();
    cy.get('[data-cy="trip-conflict-dialog"]').should(
      'contain.text',
      fixture.latestDescription,
    );
    cy.get('[data-cy="conflict-edit"]').click();
    cy.get('[data-cy="description-input"]').should(
      'have.value',
      fixture.draftDescription,
    );
  });

  it('keeps drafts when refresh fails and allows retry', () => {
    const state = openDescription();
    cy.intercept(
      { method: 'GET', pathname: '/itinerary' },
      { statusCode: 503, body: { message: 'Refresh unavailable' } },
    );
    cy.get('[data-cy="description-save"]').click();
    cy.get('[data-cy="toast"]').should('contain.text', 'Refresh unavailable');
    cy.get('[data-cy="description-input"]').should(
      'have.value',
      fixture.draftDescription,
    );
    cy.then(() => expect(state.saves).to.eq(0));
    cy.intercept({ method: 'GET', pathname: '/itinerary' }, (request) =>
      request.reply({ body: state.itinerary }),
    );
    cy.get('[data-cy="description-save"]').click();
    cy.wait('@saveItinerary');
  });

  it('preserves an event draft if another user deletes the event', () => {
    let events = [{ ...feature.event, version: 0 }];
    visitOwnedTrip(undefined, { events: () => events });
    cy.intercept(
      { method: 'PATCH', pathname: `/event/${feature.event._id}` },
      { statusCode: 404 },
    ).as('saveDeletedEvent');
    cy.get(`[data-cy="edit-event-${feature.event._id}"]`).click({
      force: true,
    });
    cy.get('[data-cy="event-title"]').clear().type(fixture.draftTitle);
    cy.then(() => {
      events = [];
    });
    cy.get('[data-cy="event-save"]').click();
    cy.contains('This item has been deleted. Your draft has been kept.').should(
      'be.visible',
    );
    cy.get('[data-cy="event-title"]').should('have.value', fixture.draftTitle);
    cy.get('@saveDeletedEvent.all').should('have.length', 0);
  });

  it('requires review before deleting an event changed after confirmation opened', () => {
    let event = { ...feature.event, version: 0 };
    visitOwnedTrip(undefined, { events: () => [event] });
    cy.intercept(
      { method: 'DELETE', pathname: `/event/${event._id}` },
      (request) => {
        expect(request.body.expectedVersion).to.eq(1);
        request.reply({ body: { message: 'Deleted' } });
      },
    ).as('deleteEvent');
    cy.get(`[data-cy="delete-event-${event._id}"]`).click({ force: true });
    cy.get('[data-cy="delete-event-dialog"]').should('be.visible');
    cy.then(() => {
      event = { ...event, title: fixture.savedTitle, version: 1 };
    });
    cy.get('[data-cy="delete-event-confirm"]').click();
    cy.get('[data-cy="trip-conflict-dialog"]').should(
      'contain.text',
      fixture.savedTitle,
    );
    cy.get('[data-cy="conflict-draft"]')
      .should('have.text', 'Delete saved version')
      .click();
    cy.wait('@deleteEvent');
  });
});
