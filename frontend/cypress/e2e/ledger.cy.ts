import {
  travelers,
  ledgerTrip,
  ledgerTripDetails,
  expenseDraft,
  expense,
  balances,
  saveFailure,
} from '../fixtures/ledger';
import { visitAsUser } from '../support/auth';

/** Opens the ledger with isolated read/write API fixtures.
 * @param readOnly - Whether the trip should expose viewer permissions.
 * @returns Nothing; queues API mocks and navigation.
 */
const visitLedger = (readOnly = false) => {
  cy.intercept(
    {
      method: 'GET',
      hostname: 'localhost',
      pathname: `/trip/${ledgerTrip._id}`,
    },
    {
      body: {
        ...ledgerTripDetails,
        currentUserRole: readOnly ? 'viewer' : 'owner',
      },
    },
  );
  cy.intercept(
    { method: 'GET', hostname: 'localhost', pathname: '/trip' },
    { body: [ledgerTrip] },
  );
  cy.intercept(
    { method: 'GET', hostname: 'localhost', pathname: '/trip/archived' },
    { body: [ledgerTrip] },
  );
  cy.intercept(
    { method: 'GET', pathname: `/api/ledger/expenses/${ledgerTrip._id}` },
    { body: [] },
  ).as('expenses');
  cy.intercept(
    { method: 'GET', pathname: `/api/ledger/${ledgerTrip._id}/balances` },
    { body: [] },
  ).as('balances');
  visitAsUser(`/trip/${ledgerTrip._id}?section=ledger`);
  cy.wait(['@expenses', '@balances']);
};

/** Opens the modal and fills its required expense fields.
 * @returns Nothing; queues interactions with stable feature selectors.
 */
const fillExpense = () => {
  cy.get('[data-cy="add-expense"]').click();
  cy.get('[data-cy="expense-description"]').should('have.focus');
  cy.get('[data-cy="expense-description"]').type(expenseDraft.description);
  cy.get('[data-cy="expense-amount"]').type(expenseDraft.amount);
};

describe('compact expense modal', () => {
  it('toggles visible chips, selects all, and saves through refreshed ledger queries', () => {
    let saved = false;
    cy.intercept(
      { method: 'POST', pathname: '/api/ledger/expenses' },
      (request) => {
        expect(request.headers.authorization).to.match(/^Bearer /);
        expect(request.body).to.deep.equal({
          tripId: ledgerTrip._id,
          description: expenseDraft.description,
          amount: 96,
          paidBy: travelers[0].id,
          splitAmong: travelers.map((traveler) => traveler.id),
        });
        saved = true;
        request.reply({ statusCode: 201, delay: 500, body: expense });
      },
    ).as('createExpense');
    visitLedger();
    cy.intercept(
      { method: 'GET', pathname: `/api/ledger/expenses/${ledgerTrip._id}` },
      (request) => request.reply({ body: saved ? [expense] : [] }),
    ).as('refreshExpenses');
    cy.intercept(
      { method: 'GET', pathname: `/api/ledger/${ledgerTrip._id}/balances` },
      (request) => request.reply({ body: saved ? balances : [] }),
    ).as('refreshBalances');
    fillExpense();
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 6 people',
    );
    cy.get('[data-cy="expense-share"]').should('have.text', '$16.00 each');
    cy.get(`[data-cy="expense-person-${travelers[1].id}"]`)
      .click()
      .should('have.attr', 'aria-pressed', 'false')
      .and('be.visible');
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 5 people',
    );
    cy.get('[data-cy="add-expense-dialog"]').screenshot('expense-desktop');
    cy.get('[data-cy="expense-select-all"]').click();
    cy.get(`[data-cy="expense-person-${travelers[1].id}"]`).should(
      'have.attr',
      'aria-pressed',
      'true',
    );
    cy.get('[data-cy="expense-save"]').click().should('be.disabled');
    cy.get('[data-cy="expense-cancel"]').should('be.disabled');
    cy.wait(['@createExpense', '@refreshExpenses', '@refreshBalances']);
    cy.get('[data-cy="add-expense-dialog"]').should('not.exist');
    cy.contains(expenseDraft.description).should('be.visible');
    cy.get('[data-cy="add-expense"]').should('have.focus').click();
    cy.get('[data-cy="expense-description"]').should('have.value', '');
  });

  it('keeps the draft on failure, blocks an empty split, and supports a different payer on mobile', () => {
    cy.viewport(390, 844);
    cy.intercept(
      { method: 'POST', pathname: '/api/ledger/expenses' },
      { statusCode: 500, body: saveFailure },
    ).as('failedSave');
    visitLedger();
    fillExpense();
    cy.get('[data-cy="expense-payer"]').click().type('may');
    cy.get('[data-cy="expense-payer-options"]').should(
      'have.attr',
      'aria-multiselectable',
      'false',
    );
    cy.get('[data-cy="add-expense-dialog"]').screenshot(
      'expense-payer-search-mobile',
    );
    cy.get('[data-cy="expense-payer"]')
      .type('{downarrow}{enter}')
      .should('have.value', travelers[1].username);
    cy.get('[data-cy="expense-payer-dropdown"]').should('not.exist');
    for (const traveler of travelers)
      cy.get(`[data-cy="expense-person-${traveler.id}"]`).click();
    cy.get('[data-cy="expense-save"]').click();
    cy.get('[data-cy="expense-split-error"]').should('be.visible');
    cy.get(`[data-cy="expense-person-${travelers[0].id}"]`).click();
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 1 person',
    );
    cy.get('[data-cy="expense-select-all"]').click();
    cy.get('[data-cy="add-expense-dialog"]').screenshot('expense-mobile');
    cy.get('[data-cy="expense-save"]').click();
    cy.wait('@failedSave');
    cy.get('[data-cy="expense-submit-error"]').should(
      'have.text',
      saveFailure.message,
    );
    cy.get('[data-cy="expense-description"]').should(
      'have.value',
      expenseDraft.description,
    );
    cy.get('[data-cy="expense-payer"]').should(
      'have.value',
      travelers[1].username,
    );
    cy.get('[data-cy="expense-cancel"]').click();
    cy.get('[data-cy="add-expense-dialog"]').should('not.exist');
    cy.get('[data-cy="add-expense"]').should('have.focus');
  });

  it('replaces one payer at a time and restores the committed value after unselected search text', () => {
    visitLedger();
    fillExpense();
    cy.get('[data-cy="expense-payer-toggle"]').click();
    cy.get('[data-cy="expense-payer"]').should(
      'have.attr',
      'aria-expanded',
      'true',
    );
    cy.get('[data-cy="expense-payer-toggle"]').click();
    cy.get('[data-cy="expense-payer"]').should(
      'have.attr',
      'aria-expanded',
      'false',
    );
    cy.get('[data-cy="expense-payer"]')
      .should('have.value', 'You')
      .click()
      .type('may');
    cy.get(`[data-cy="expense-payer-option-${travelers[1].id}"]`).click();
    cy.get('[data-cy="expense-payer"]')
      .should('have.value', travelers[1].username)
      .click()
      .type('sam');
    cy.get('[data-cy="add-expense-dialog"]').screenshot(
      'expense-payer-search-desktop',
    );
    cy.get('[data-cy="expense-payer"]')
      .type('{downarrow}{enter}')
      .should('have.value', travelers[2].username)
      .click();
    cy.get('[data-cy="expense-payer-options"] [aria-selected="true"]')
      .should('have.length', 1)
      .and('contain.text', travelers[2].username);
    cy.get('[data-cy="expense-payer"]').type('no matching traveler');
    cy.get('[data-cy="expense-payer-dropdown"]').should(
      'contain.text',
      'No travelers match your search.',
    );
    cy.get('[data-cy="expense-payer"]')
      .type('{esc}')
      .should('have.value', travelers[2].username);
    cy.get('[data-cy="add-expense-dialog"]').should('be.visible');
    cy.get('[data-cy="expense-payer"]').click().type('uncommitted');
    cy.get('[data-cy="expense-amount"]').click();
    cy.get('[data-cy="expense-payer"]').should(
      'have.value',
      travelers[2].username,
    );
  });

  it('dismisses with Escape and keeps creation unavailable to viewers', () => {
    visitLedger();
    cy.get('[data-cy="add-expense"]').click();
    cy.get('[data-cy="expense-description"]').type('{esc}');
    cy.get('[data-cy="add-expense-dialog"]').should('not.exist');
    cy.get('[data-cy="add-expense"]').should('have.focus');
    visitLedger(true);
    cy.get('[data-cy="add-expense"]').should('not.exist');
  });
});
