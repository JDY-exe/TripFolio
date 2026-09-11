import navigation from '../fixtures/navigation.json'

describe('Navigation', () => {
  it('redirects to My Trips and opens the main destinations', () => {
    cy.visit('/')
    cy.location('pathname').should('eq', navigation.tripsPath)

    for (const destination of navigation.destinations) {
      cy.contains('nav button', destination.label).click()
      cy.location('pathname').should('eq', destination.path)
    }
  })

  it('switches trip sections locally and returns to My Trips', () => {
    cy.visit(navigation.tripPath)
    cy.contains('h2', navigation.sections[0]).should('be.visible')

    for (const section of navigation.sections.slice(1)) {
      cy.contains('nav button', section).click()
      cy.contains('h2', section).should('be.visible')
      cy.location('pathname').should('eq', navigation.tripPath)
    }

    cy.contains('nav button', navigation.backLabel).click()
    cy.location('pathname').should('eq', navigation.tripsPath)
  })
})
