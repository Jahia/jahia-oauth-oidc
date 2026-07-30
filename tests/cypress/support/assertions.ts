/**
 * Assertions against the test template set's rendered output
 * (tests/jahia-module/.../template.jahia-oauth-oidc-test-module.jsp).
 */

interface MappedUser {
    email: string;
    firstName: string;
    lastName: string;
}

export function assertIsGuest(): void {
    cy.get('[data-test="user-guest"]').should('be.visible').and('contain', 'Guest');
}

/**
 * Assert the OIDC user is logged in AND that the claims actually flowed through the
 * mapper into the Jahia user — checking only "logged in" would pass even if every
 * claim mapping silently dropped.
 *
 * The username is not asserted: jcr-auth-provider uses ssoLoginId, which is mapped from
 * Keycloak's `sub` (a UUID generated at realm import), so it is not known upfront.
 */
export function assertLoggedInWithMappedClaims(user: MappedUser): void {
    cy.get('[data-test="user-logged-in"]', {timeout: 20000}).should('be.visible');
    cy.get('[data-test="j:email"]').should('contain', user.email);
    cy.get('[data-test="j:firstName"]').should('contain', user.firstName);
    cy.get('[data-test="j:lastName"]').should('contain', user.lastName);
}

/** Assert which page the flow landed on — used to tell the return modes apart. */
export function assertOnPage(pageName: string): void {
    cy.get('[data-test="page-name"]', {timeout: 20000}).should('have.text', pageName);
}
