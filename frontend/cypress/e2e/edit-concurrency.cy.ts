import { visitOwnedTrip } from '../support/ownedTrip';
import {
  originalEvent,
  latestEvent,
  submittedTime,
  draftNotes,
  conflictResponse,
} from '../fixtures/edit-concurrency';

/** Opens the cached event without depending on CSS action selectors. */
const openEditor = () =>
  cy.get(`[data-cy="edit-event-${originalEvent._id}"]`).click({ force: true });

describe('checked event editors', () => {
  it('keeps Save usable when the one initial refresh fails and sends only the note edit', () => {
    visitOwnedTrip(undefined, { events: () => [originalEvent] });
    cy.intercept('GET', `**/event/${originalEvent._id}`, {
      statusCode: 503,
    }).as('refresh');
    cy.intercept('PATCH', `**/event/${originalEvent._id}`, (request) => {
      expect(request.body).to.deep.equal({
        expectedVersion: 3,
        changes: { notes: draftNotes },
        original: { notes: originalEvent.notes },
      });
      request.reply({
        body: { ...latestEvent, version: 5, notes: draftNotes },
      });
    }).as('save');
    openEditor();
    cy.wait('@refresh');
    cy.get('[data-cy="event-notes"]').clear().type(draftNotes);
    cy.get('[data-cy="event-save"]').should('not.be.disabled').click();
    cy.wait('@save');
    cy.get('[data-cy="edit-conflict-dialog"]').should('not.exist');
  });

  it('reviews only overlapping fields, then resubmits with unrelated notes intact', () => {
    let saved = originalEvent;
    visitOwnedTrip(undefined, { events: () => [saved] });
    cy.intercept('GET', `**/event/${originalEvent._id}`, {
      body: originalEvent,
    }).as('refresh');
    let attempts = 0;
    cy.intercept('PATCH', `**/event/${originalEvent._id}`, (request) => {
      attempts++;
      if (attempts === 1) {
        request.reply({ statusCode: 409, body: conflictResponse });
        return;
      }
      expect(request.body).to.deep.equal({
        expectedVersion: 4,
        changes: { startTime: submittedTime, notes: draftNotes },
        original: {
          startTime: latestEvent.startTime,
          notes: originalEvent.notes,
        },
      });
      saved = {
        ...latestEvent,
        version: 5,
        startTime: submittedTime,
        notes: draftNotes,
      };
      request.reply({ body: saved });
    }).as('save');
    openEditor();
    cy.wait('@refresh');
    cy.get('[data-cy="event-start"]').clear().type('11:00');
    cy.get('[data-cy="event-notes"]').clear().type(draftNotes);
    cy.get('[data-cy="event-save"]').click();
    cy.wait('@save');
    cy.get('[data-cy="edit-conflict-dialog"]').should('be.visible');
    cy.contains('Saved value').should('be.visible');
    cy.contains('Your value').should('be.visible');
    cy.get('[data-cy="conflict-save"]').should('be.disabled');
    cy.get('[data-cy="edit-conflict-dialog"]').screenshot(
      'edit-conflict-desktop',
    );
    cy.viewport(390, 844);
    cy.get('[data-cy="edit-conflict-dialog"]').screenshot(
      'edit-conflict-mobile',
    );
    cy.get('[data-cy="conflict-startTime-yours"]').check();
    cy.get('[data-cy="conflict-save"]').click();
    cy.wait('@save');
    cy.get('[data-cy="edit-conflict-dialog"]').should('not.exist');
  });

  it('ignores an initial refresh that arrives after saving starts', () => {
    visitOwnedTrip(undefined, { events: () => [originalEvent] });
    cy.intercept('GET', `**/event/${originalEvent._id}`, {
      delay: 1200,
      body: latestEvent,
    }).as('refresh');
    cy.intercept('PATCH', `**/event/${originalEvent._id}`, {
      delay: 1800,
      body: { ...latestEvent, version: 5, notes: draftNotes },
    }).as('save');
    openEditor();
    cy.get('[data-cy="event-notes"]').clear().type(draftNotes, { delay: 0 });
    cy.get('[data-cy="event-save"]').click();
    cy.wait('@refresh');
    cy.get('[data-cy="event-notes"]').should('have.value', draftNotes);
    cy.wait('@save');
  });
});
