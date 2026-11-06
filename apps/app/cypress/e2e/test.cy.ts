describe('App', () => {
  it('opens on the Feed tab', () => {
    cy.visit('/')
    cy.contains('ion-title', 'Feed')
  })
})
