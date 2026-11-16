import {
  travelers,
  ledgerTrip,
  ledgerTripDetails,
  expenseDraft,
  expense,
  balances,
  saveFailure,
  cardTravelers,
  cardExpenses,
  pickerTravelers,
  editedExpense,
  balanceTravelers,
  groupBalances,
  incomingBalances,
  budgetFailure,
} from '../fixtures/ledger';
import { visitAsUser } from '../support/auth';

/** Opens the ledger with isolated read/write API fixtures.
 * @param readOnly - Whether the trip should expose viewer permissions.
 * @param initialExpenses - Expenses to show before mutations.
 * @param tripTravelers - Member directory used to resolve expense participants.
 * @returns Nothing; queues API mocks and navigation.
 */
const visitLedger = (
  readOnly = false,
  initialExpenses = [] as (typeof expense)[],
  tripTravelers = travelers,
  initialBalances = [] as typeof balances,
  balancesFail = false,
) => {
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
    { body: [{ ...ledgerTrip, travelers: tripTravelers }] },
  );
  cy.intercept(
    { method: 'GET', hostname: 'localhost', pathname: '/trip/archived' },
    { body: [ledgerTrip] },
  );
  cy.intercept(
    { method: 'GET', pathname: `/api/ledger/expenses/${ledgerTrip._id}` },
    { body: initialExpenses },
  ).as('expenses');
  cy.intercept(
    { method: 'GET', pathname: `/api/ledger/${ledgerTrip._id}/balances` },
    { statusCode: balancesFail ? 500 : 200, body: initialBalances },
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
  it('toggles avatar selections, selects all, and saves through refreshed ledger queries', () => {
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
    cy.get('[data-cy="expense-description"]').should(
      'have.css',
      'border-top-width',
      '0px',
    );
    cy.get('[data-cy="expense-description"]')
      .focus()
      .should('not.have.css', 'box-shadow', 'none');
    cy.get('[data-cy="expense-payer-combobox"]').should(
      'have.css',
      'border-top-width',
      '0px',
    );
    cy.get('[data-cy="expense-participant-search"]').should(
      'have.css',
      'border-top-width',
      '0px',
    );
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

describe('IOU expense cards', () => {
  it('clears pointer action reveals after modal dismissal while preserving keyboard access', () => {
    visitLedger(false, cardExpenses, cardTravelers);
    const edit = `[data-cy="edit-expense-${expense._id}"]`;
    const remove = `[data-cy="delete-expense-${expense._id}"]`;
    const actions = `[data-cy="expense-card-${expense._id}"] [data-cy="expense-card-actions"]`;

    cy.get(edit).focus().click();
    cy.get('[data-cy="expense-cancel"]').click();
    cy.get('[data-cy="edit-expense-dialog"]').should('not.exist');
    cy.get(edit).should('have.focus');
    cy.get(actions).should('have.css', 'opacity', '0');

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get(remove).should('have.focus');
    cy.get(actions).should('have.css', 'opacity', '1');
    cy.get(remove).click();
    cy.get('[data-cy="delete-expense-dialog"]').should('be.visible');
    cy.get('[data-cy="delete-expense-dialog"]')
      .contains('button', 'Cancel')
      .click();
    cy.get('[data-cy="delete-expense-dialog"]').should('not.exist');
    cy.get(remove).should('have.focus');
    cy.get(actions).should('have.css', 'opacity', '0');
  });

  it('fits recipient previews to half a card and animates inline overflow after resizing', () => {
    cy.viewport(1440, 1000);
    visitLedger(false, cardExpenses, cardTravelers);
    cy.get('[data-cy="expense-list"]').children().should('have.length', 2);
    cy.get(`[data-cy="expense-card-${cardExpenses[0]._id}"]`).within(() => {
      cy.get('[data-cy="expense-card-amount"]').should('have.text', '$96.00');
      cy.contains('Paid by')
        .parent()
        .should('contain.text', 'owner')
        .and('contain.text', 'for');
      cy.get('[data-cy="expense-recipient-preview"]').should(
        'contain.text',
        'Maya',
      );
      cy.get('[data-cy="expense-recipient-toggle"]').should('not.exist');
    });
    cy.get(`[data-cy="expense-card-${cardExpenses[1]._id}"]`).as('groupCard');
    cy.get('@groupCard').within(() => {
      cy.get('[data-cy="expense-recipient-preview"]').then(($preview) => {
        const preview = $preview[0];
        const card = preview.closest('article')!;
        expect(preview.getBoundingClientRect().width).to.be.at.most(
          card.getBoundingClientRect().width / 2,
        );
        expect(preview.scrollWidth).to.be.at.most(preview.clientWidth + 1);
      });
      cy.get('[data-cy="expense-recipient-toggle"]')
        .should('have.attr', 'aria-expanded', 'false')
        .click()
        .should('have.attr', 'aria-expanded', 'true');
      cy.get('[data-cy="expense-recipient-details"]')
        .should('have.attr', 'aria-hidden', 'false')
        .and('contain.text', 'Robin');
      cy.get('[data-cy="expense-recipient-details"]').should(
        'not.have.attr',
        'inert',
      );
      cy.get('[data-cy="expense-recipient-details"]').should('be.visible');
    });
    cy.get('@groupCard').screenshot('ledger-card-expanded-desktop');
    cy.viewport(390, 844);
    cy.get('@groupCard').within(() => {
      cy.get('[data-cy="expense-recipient-preview"]').should(($preview) => {
        expect($preview[0].scrollWidth).to.be.at.most(
          $preview[0].clientWidth + 1,
        );
      });
      cy.get('[data-cy="expense-recipient-toggle"]')
        .click()
        .should('have.attr', 'aria-expanded', 'false');
      cy.get('[data-cy="expense-recipient-details"]').should(
        'have.attr',
        'inert',
      );
    });
    cy.get('@groupCard').screenshot('ledger-card-collapsed-mobile');
    cy.document().should((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(
        document.documentElement.clientWidth,
      );
    });
  });

  it('reveals keyboard actions, opens the existing editor, and confirms deletion before refreshing', () => {
    let removed = false;
    visitLedger(false, cardExpenses, cardTravelers);
    cy.intercept(
      { method: 'GET', pathname: `/api/ledger/expenses/${ledgerTrip._id}` },
      (request) =>
        request.reply({ body: removed ? [cardExpenses[1]] : cardExpenses }),
    ).as('refreshCardExpenses');
    cy.intercept(
      { method: 'DELETE', pathname: `/api/ledger/expenses/${expense._id}` },
      (request) => {
        removed = true;
        request.reply({
          statusCode: 200,
          body: { message: 'Expense deleted successfully' },
        });
      },
    ).as('deleteExpense');
    cy.get(
      `[data-cy="expense-card-${expense._id}"] [data-cy="expense-card-actions"]`,
    ).should('have.css', 'opacity', '0');
    cy.get(`[data-cy="edit-expense-${expense._id}"]`).focus();
    cy.get(
      `[data-cy="expense-card-${expense._id}"] [data-cy="expense-card-actions"]`,
    ).should('have.css', 'opacity', '1');
    cy.get(`[data-cy="edit-expense-${expense._id}"]`).click();
    cy.get('[role="dialog"]')
      .should('contain.text', 'Edit Expense')
      .and('contain.text', 'Save Changes');
    cy.get('[role="dialog"]').contains('button', 'Cancel').click();
    cy.get(`[data-cy="delete-expense-${expense._id}"]`).focus().click();
    cy.get('[data-cy="delete-expense-dialog"]')
      .should('be.visible')
      .contains('button', 'Delete expense')
      .click();
    cy.wait(['@deleteExpense', '@refreshCardExpenses']);
    cy.get(`[data-cy="expense-card-${expense._id}"]`).should('not.exist');
    cy.get(`[data-cy="expense-card-${cardExpenses[1]._id}"]`).should(
      'be.visible',
    );
    visitLedger(true, cardExpenses, cardTravelers);
    cy.get('[data-cy="expense-card-actions"]').should('not.exist');
    cy.get('[data-cy="expense-recipient-toggle"]').should('exist');
  });
});

describe('expense participant picker', () => {
  it('retains selections across search, highlights selected borders, and supports keyboard toggles', () => {
    cy.viewport(1000, 1000);
    cy.intercept('GET', '/test-avatar.png', { fixture: 'avatar.png' });
    cy.intercept('GET', '/broken-avatar.png', { statusCode: 404 });
    visitLedger(false, [], pickerTravelers);
    fillExpense();
    cy.get('[data-cy="expense-participant-grid"] button').should(
      'have.length',
      10,
    );
    cy.get(
      `[data-cy="expense-person-${travelers[1].id}"] [data-cy="avatar-image"]`,
    ).should(($image) => {
      expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0);
    });
    cy.get(
      `[data-cy="expense-person-${travelers[2].id}"] [data-cy="avatar-fallback"]`,
    ).should('exist');
    cy.get(
      `[data-cy="expense-person-${travelers[1].id}"] [data-cy="avatar-toggle-border"]`,
    )
      .invoke('css', 'border-top-color')
      .then((selectedColor) => {
        cy.get(`[data-cy="expense-person-${travelers[1].id}"]`).focus();
        cy.press(Cypress.Keyboard.Keys.SPACE);
        cy.get(`[data-cy="expense-person-${travelers[1].id}"]`).should(
          'have.attr',
          'aria-pressed',
          'false',
        );
        cy.get(
          `[data-cy="expense-person-${travelers[1].id}"] [data-cy="avatar-toggle-border"]`,
        ).should('not.have.css', 'border-top-color', selectedColor);
        cy.get(
          `[data-cy="expense-person-${travelers[1].id}"] [data-cy="avatar-toggle-check"]`,
        ).should('have.css', 'opacity', '0');
      });
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 9 people',
    );
    cy.get('[data-cy="expense-participant-search"]').type(' mAy ');
    cy.get('[data-cy="expense-participant-grid"] button')
      .should('have.length', 1)
      .and('have.attr', 'aria-label', 'Maya');
    cy.get(`[data-cy="expense-person-${travelers[1].id}"]`).should(
      'have.attr',
      'aria-pressed',
      'false',
    );
    cy.get('[data-cy="expense-select-all"]').click();
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 10 people',
    );
    cy.get('[data-cy="expense-participant-search"]').clear();
    cy.get('[data-cy="expense-participant-grid"] button').should(($buttons) => {
      expect(
        [...$buttons].map((button) => button.getAttribute('data-cy')),
      ).to.deep.equal(
        pickerTravelers.map((traveler) => `expense-person-${traveler.id}`),
      );
    });
    cy.get(`[data-cy="expense-person-${travelers[1].id}"]`).should(
      'have.attr',
      'aria-pressed',
      'true',
    );
    cy.get('[data-cy="expense-participant-picker"]').screenshot(
      'expense-avatar-picker-desktop',
    );
    cy.get('[data-cy="expense-participant-search"]').type(
      'nobody matches{enter}',
    );
    cy.get('[data-cy="expense-participant-empty"]').should('be.visible');
    cy.get('[data-cy="add-expense-dialog"]').should('be.visible');
    cy.get('[data-cy="expense-participant-search"]')
      .type('{esc}')
      .should('have.value', '');
    cy.get('[data-cy="expense-participant-grid"] button').should(
      'have.length',
      10,
    );
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 10 people',
    );
    cy.viewport(390, 844);
    cy.get('[data-cy="expense-participant-picker"]').screenshot(
      'expense-avatar-picker-mobile',
    );
    cy.get('[data-cy="expense-participant-grid"]').should(($grid) => {
      expect($grid[0].scrollWidth).to.be.at.most($grid[0].clientWidth);
      expect(
        getComputedStyle($grid[0]).gridTemplateColumns.split(' '),
      ).to.have.length(3);
    });
  });

  it('loads saved selections in edit, retains a failed draft, and refreshes the ledger after retry', () => {
    let saved = false;
    visitLedger(false, cardExpenses, cardTravelers);
    cy.intercept(
      { method: 'PATCH', pathname: `/api/ledger/expenses/${expense._id}` },
      (request) => {
        expect(request.body).to.deep.equal({
          description: editedExpense.description,
          amount: editedExpense.amount,
          paidBy: editedExpense.paidBy,
          splitAmong: editedExpense.splitAmong,
        });
        request.reply(
          saved
            ? { body: editedExpense, delay: 300 }
            : { statusCode: 500, body: saveFailure },
        );
        saved = true;
      },
    ).as('updateExpense');
    cy.intercept(
      { method: 'GET', pathname: `/api/ledger/expenses/${ledgerTrip._id}` },
      { body: [editedExpense, cardExpenses[1]] },
    ).as('updatedExpenses');
    cy.get(`[data-cy="edit-expense-${expense._id}"]`).focus().click();
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 1 person',
    );
    cy.get(`[data-cy="expense-person-${travelers[1].id}"]`).should(
      'have.attr',
      'aria-pressed',
      'true',
    );
    cy.get(`[data-cy="expense-person-${travelers[0].id}"]`).should(
      'have.attr',
      'aria-pressed',
      'false',
    );
    cy.get('[data-cy="expense-amount"]').clear().type('128.00');
    cy.get('[data-cy="expense-participant-search"]').type('Robin');
    cy.get(`[data-cy="expense-person-${cardTravelers[9].id}"]`)
      .click()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy="expense-save"]').click();
    cy.wait('@updateExpense');
    cy.get('[data-cy="expense-submit-error"]').should(
      'have.text',
      saveFailure.message,
    );
    cy.get('[data-cy="expense-participant-search"]').should(
      'have.value',
      'Robin',
    );
    cy.get('[data-cy="expense-amount"]').should('have.value', '128.00');
    cy.get('[data-cy="expense-split-label"]').should(
      'have.text',
      'Paid for 2 people',
    );
    cy.get('[data-cy="expense-share"]').should('have.text', '$64.00 each');
    cy.get('[data-cy="expense-save"]').click().should('be.disabled');
    cy.get('[data-cy="expense-participant-search"]').should('be.disabled');
    cy.get(`[data-cy="expense-person-${cardTravelers[9].id}"]`).should(
      'be.disabled',
    );
    cy.wait(['@updateExpense', '@updatedExpenses']);
    cy.get('[data-cy="edit-expense-dialog"]').should('not.exist');
    cy.get(
      `[data-cy="expense-card-${expense._id}"] [data-cy="expense-card-amount"]`,
    ).should('have.text', '$128.00');
  });

  it('handles an empty member directory without exposing a saveable draft', () => {
    visitLedger(false, [], []);
    cy.get('[data-cy="add-expense"]').should('be.disabled');
  });
});

describe('personal balance sidebar and group dialog', () => {
  it('keeps unrelated payments out of the sidebar and scrolls all payments in the dialog', () => {
    cy.viewport(1440, 1000);
    visitLedger(false, cardExpenses, balanceTravelers, groupBalances);
    cy.get('[data-cy="balances-send"]').within(() => {
      cy.get('[data-cy="personal-balance-row"]').should('have.length', 2);
      cy.contains('Maya').should('be.visible');
      cy.contains('$12.00').should('be.visible');
      cy.contains('Sam').should('be.visible');
    });
    cy.get('[data-cy="balances-receive"]').should('not.exist');
    cy.get('[data-cy="personal-balances"]').should(
      'not.contain.text',
      'Traveler 24',
    );
    cy.get('[data-cy="personal-balances"]').screenshot(
      'personal-balances-desktop',
    );
    cy.get('[data-cy="expand-balances"]').click();
    cy.get('[data-cy="balances-dialog"]').should('be.visible');
    cy.get('[data-cy="group-balance-row"]').should(
      'have.length',
      groupBalances.length,
    );
    cy.get('[data-cy="balances-scroll"]').as('balanceScroll').focus();
    cy.press(Cypress.Keyboard.Keys.END);
    cy.contains('[data-cy="group-balance-row"]', 'Traveler 24').should(
      'be.visible',
    );
    cy.get('@balanceScroll')
      .should(($scroll) => {
        expect($scroll[0].scrollHeight).to.be.greaterThan(
          $scroll[0].clientHeight,
        );
      })
      .scrollTo('bottom');
    cy.contains('[data-cy="group-balance-row"]', 'Traveler 24').should(
      'be.visible',
    );
    cy.get('[data-cy="balances-dialog"] h2').should('be.visible');
    cy.get('[data-cy="balances-done"]').should('be.visible');
    cy.get('[data-cy="balances-dialog"]').screenshot(
      'everyone-balances-desktop',
    );
    cy.get('[data-cy="balances-dialog"]').type('{esc}');
    cy.get('[data-cy="balances-dialog"]').should('not.exist');
    cy.get('[data-cy="expand-balances"]').should('have.focus');
  });

  it('shows incoming payments on mobile and preserves the group view when you are settled', () => {
    cy.viewport(390, 844);
    visitLedger(true, cardExpenses, cardTravelers, incomingBalances);
    cy.get('[data-cy="balances-send"]').should('not.exist');
    cy.get(
      '[data-cy="balances-receive"] [data-cy="personal-balance-row"]',
    ).should('have.length', 2);
    cy.get('[data-cy="edit-budget"]').should('not.exist');
    cy.get('[data-cy="personal-balances"]').screenshot(
      'personal-balances-mobile',
    );
    cy.get('[data-cy="expand-balances"]').click();
    cy.get('[data-cy="balances-dialog"]').screenshot(
      'everyone-balances-mobile',
    );
    cy.document().should((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(
        document.documentElement.clientWidth,
      );
    });
    cy.get('[data-cy="balances-done"]').click();
    cy.get('[data-cy="balances-dialog"]').should('not.exist');
    visitLedger(false, [], travelers, groupBalances.slice(2, 3));
    cy.get('[data-cy="balances-send"]').should('not.exist');
    cy.get('[data-cy="balances-receive"]').should('not.exist');
    cy.get('[data-cy="expand-balances"]').click();
    cy.get('[data-cy="group-balance-row"]').should('have.length', 1);
  });

  it('shows a query failure instead of claiming there are no payments and can retry', () => {
    visitLedger(false, [], travelers, [], true);
    cy.get('[data-cy="personal-balances"]', { timeout: 15000 }).should(
      'contain.text',
      'Could not load balances.',
    );
    cy.get('[data-cy="balances-send"]').should('not.exist');
    cy.intercept('GET', `/api/ledger/${ledgerTrip._id}/balances`, {
      body: incomingBalances,
    });
    cy.get('[data-cy="balances-retry"]').click();
    cy.get(
      '[data-cy="balances-receive"] [data-cy="personal-balance-row"]',
    ).should('have.length', 2);
  });
});

describe('budget overview', () => {
  it('validates drafts, keeps a failed save, and refreshes the displayed budget on success', () => {
    let budget = ledgerTrip.budget;
    let shouldFail = true;
    visitLedger(false, [expense]);
    cy.intercept('PATCH', `/api/ledger/${ledgerTrip._id}/budget`, (request) => {
      expect(request.headers.authorization).to.match(/^Bearer /);
      if (shouldFail) {
        shouldFail = false;
        request.reply({ statusCode: 500, body: budgetFailure });
      } else {
        budget = request.body.budget;
        request.reply({ body: { ...ledgerTrip, budget }, delay: 200 });
      }
    }).as('saveBudget');
    cy.intercept('GET', '/trip', (request) =>
      request.reply({ body: [{ ...ledgerTrip, budget }] }),
    );
    cy.get('[data-cy="budget-spent"]').should('have.text', '$96.00');
    cy.get('[data-cy="budget-overview"]').screenshot('budget-overview');
    cy.get('[data-cy="edit-budget"]').click();
    cy.get('[data-cy="budget-input"]').should('have.focus').clear();
    cy.get('[data-cy="budget-save"]').click();
    cy.get('[data-cy="budget-input"]').should(
      'have.attr',
      'aria-invalid',
      'true',
    );
    cy.get('[data-cy="budget-input"]').type('-1');
    cy.get('[data-cy="budget-save"]').click();
    cy.get('[data-cy="budget-input"]')
      .should('have.attr', 'aria-invalid', 'true')
      .clear()
      .type('80');
    cy.get('[data-cy="budget-save"]').click();
    cy.wait('@saveBudget');
    cy.get('[data-cy="budget-save-error"]').should(
      'have.text',
      budgetFailure.message,
    );
    cy.get('[data-cy="budget-input"]').should('have.value', '80');
    cy.get('[data-cy="budget-save"]').click();
    cy.wait('@saveBudget');
    cy.get('[data-cy="budget-total"]').should('have.text', '$80.00');
    cy.get('[data-cy="budget-overview"]').should('contain.text', 'Over budget');
    cy.get('[data-cy="budget-remaining"]').should('have.text', '$16.00');
    cy.get('[data-cy="budget-overview"]').screenshot(
      'budget-overview-over-budget',
    );
    cy.get('[data-cy="edit-budget"]').should('have.focus').click();
    cy.get('[data-cy="budget-input"]')
      .should('have.value', '80')
      .clear()
      .type('150');
    cy.get('[data-cy="budget-cancel"]').click();
    cy.get('[data-cy="edit-budget"]').click();
    cy.get('[data-cy="budget-input"]')
      .should('have.value', '80')
      .clear()
      .type('0');
    cy.get('[data-cy="budget-save"]').click();
    cy.wait('@saveBudget');
    cy.get('[data-cy="budget-overview"]').should(
      'contain.text',
      'No trip budget set.',
    );
  });
});
