import featureFixture from '../fixtures/owned-features.json';
import { visitOwnedTrip } from '../support/ownedTrip';

type Reservation =
  | typeof featureFixture.flight
  | typeof featureFixture.rental
  | typeof featureFixture.accommodation;

const categories = [
  {
    kind: 'flight',
    path: '/logistics/flights',
    record: featureFixture.flight,
    add: 'add-flight',
    form: 'flight-form',
    save: 'flight-save',
    name: 'flight-name',
    empty: 'No flights added yet.',
  },
  {
    kind: 'rental',
    path: '/logistics/rental_cars',
    record: featureFixture.rental,
    add: 'add-rental',
    form: 'rental-form',
    save: 'rental-save',
    name: 'rental-name',
    empty: 'No rental cars added yet.',
  },
  {
    kind: 'accommodation',
    path: '/logistics/hotels',
    record: featureFixture.accommodation,
    add: 'add-accommodation',
    form: 'accommodation-form',
    save: 'accommodation-save',
    name: 'accommodation-name',
    empty: 'No accommodations added yet.',
  },
] as const;

/** Advances a reservation form from its details step to Save. */
const advanceToSave = (kind: string) => {
  if (kind === 'flight') {
    cy.get('[data-cy="flight-next"]').click();
    cy.get('[data-cy="flight-next"]').click();
    cy.get('[data-cy="flight-next"]').click();
  } else {
    cy.get(`[data-cy="${kind}-next"]`).click();
  }
};

describe('trip logistics', () => {
  for (const category of categories) {
    it(`creates a ${category.kind} after form validation`, () => {
      let saved: Reservation[] = [];
      cy.intercept({ method: 'POST', pathname: category.path }, (request) => {
        const reservation = {
          ...category.record,
          ...request.body,
        } as Reservation;
        saved = [reservation];
        request.reply({ body: { reservation } });
      }).as('createReservation');
      visitOwnedTrip('Logistics', {
        reservations: (path) => (path === category.path ? saved : []),
      });
      cy.contains(category.empty).should('exist');
      cy.get(`[data-cy="${category.add}"]`).click();
      cy.get(`[data-cy="${category.kind}-next"]`).click();
      cy.get(`[data-cy="${category.form}"] [role="alert"]`).should('exist');
      cy.get('@createReservation.all').should('have.length', 0);

      if (category.kind === 'flight') {
        cy.get('[data-cy="flight-number"]').type('AA123');
        cy.get('[data-cy="flight-depart-airport"]').type('IN');
        cy.get('[data-cy="flight-departure"]').type('2030-04-01T08:00');
        cy.get('[data-cy="flight-arrive-airport"]').type('MIA');
        cy.get('[data-cy="flight-arrival"]').type('2030-04-01T10:00');
        cy.get('[data-cy="flight-next"]').click();
        cy.get('[data-cy="flight-form"] [role="alert"]').should(
          'contain.text',
          'Use three-letter airport codes for leg 1.',
        );
        cy.get('[data-cy="flight-depart-airport"]').type('D');
        cy.get('[data-cy="flight-next"]').click();
        cy.get('[data-cy="flight-name"]').type(category.record.name);
        cy.get('[data-cy="flight-next"]').click();
        cy.get('[data-cy="flight-next"]').click();
      } else if (category.kind === 'rental') {
        cy.get('[data-cy="rental-name"]').type(category.record.name);
        cy.get('[data-cy="rental-company"]').type(
          category.record.rentals.company,
        );
        cy.get('[data-cy="rental-pickup"]').type('2030-04-01');
        cy.get('[data-cy="rental-return"]').type('2030-03-31');
        cy.get('[data-cy="rental-next"]').click();
        cy.get('[data-cy="rental-form"] [role="alert"]').should(
          'contain.text',
          'Return cannot be before pick-up.',
        );
        cy.get('[data-cy="rental-return"]').clear().type('2030-04-05');
        cy.get('[data-cy="rental-next"]').click();
      } else {
        cy.get('[data-cy="accommodation-name"]').type(category.record.name);
        cy.get('[data-cy="accommodation-address"]').type(
          category.record.accommodations.address,
        );
        cy.get('[data-cy="accommodation-check-in"]').type('2030-04-01');
        cy.get('[data-cy="accommodation-check-out"]').type('2030-03-31');
        cy.get('[data-cy="accommodation-next"]').click();
        cy.get('[data-cy="accommodation-form"] [role="alert"]').should(
          'contain.text',
          'Check-out cannot be before check-in.',
        );
        cy.get('[data-cy="accommodation-check-out"]')
          .clear()
          .type('2030-04-05');
        cy.get('[data-cy="accommodation-next"]').click();
      }

      cy.get(`[data-cy="${category.save}"]`).click();
      cy.wait('@createReservation')
        .its('request.body.name')
        .should('eq', category.record.name);
      cy.get(`[data-cy="reservation-card-${category.record._id}"]`).should(
        'contain.text',
        category.record.name,
      );
    });

    it(`edits and deletes a ${category.kind}`, () => {
      let saved: Reservation[] = [category.record];
      cy.intercept(
        {
          method: 'PATCH',
          pathname: `${category.path}/${category.record._id}`,
        },
        (request) => {
          const reservation = {
            ...category.record,
            ...request.body,
          } as Reservation;
          saved = [reservation];
          request.reply({ body: { reservation } });
        },
      ).as('editReservation');
      cy.intercept(
        {
          method: 'DELETE',
          pathname: `${category.path}/${category.record._id}`,
        },
        (request) => {
          saved = [];
          request.reply({ statusCode: 204 });
        },
      ).as('deleteReservation');
      visitOwnedTrip('Logistics', {
        reservations: (path) => (path === category.path ? saved : []),
      });
      cy.get(`[data-cy="reservation-card-${category.record._id}"]`).should(
        'contain.text',
        category.record.name,
      );
      cy.get(`[data-cy="edit-reservation-${category.record._id}"]`).click({
        force: true,
      });
      if (category.kind === 'flight') {
        cy.get('[data-cy="flight-next"]').click();
        cy.get(`[data-cy="${category.name}"]`)
          .clear()
          .type(`Updated ${category.record.name}`);
        cy.get('[data-cy="flight-next"]').click();
        cy.get('[data-cy="flight-next"]').click();
      } else {
        cy.get(`[data-cy="${category.name}"]`)
          .clear()
          .type(`Updated ${category.record.name}`);
        advanceToSave(category.kind);
      }
      cy.get(`[data-cy="${category.save}"]`).click();
      cy.wait('@editReservation')
        .its('request.body.name')
        .should('eq', `Updated ${category.record.name}`);
      cy.get(`[data-cy="reservation-card-${category.record._id}"]`).should(
        'contain.text',
        `Updated ${category.record.name}`,
      );
      cy.get(`[data-cy="delete-reservation-${category.record._id}"]`).click({
        force: true,
      });
      cy.get('[data-cy="delete-reservation-dialog"]').should('exist');
      cy.get('[data-cy="delete-reservation-confirm"]').click();
      cy.wait('@deleteReservation');
      cy.get(`[data-cy="reservation-card-${category.record._id}"]`).should(
        'not.exist',
      );
    });
  }
});
