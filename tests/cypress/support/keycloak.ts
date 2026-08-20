/**
 * Keycloak — the real OIDC provider the suite authenticates against.
 *
 * Two base URLs are in play and they are deliberately different (see cypress.config.ts):
 * the browser is redirected to the authorization endpoint, while Jahia calls the token
 * and userinfo endpoints server-side from inside its container.
 */

export const KEYCLOAK_USER = {
    username: 'oidc.user',
    password: 'Passw0rd!',
    email: 'oidc.user@example.org',
    firstName: 'Odile',
    lastName: 'Connect'
};

export const KEYCLOAK_OTHER_USER = {
    username: 'other.user',
    password: 'Passw0rd!',
    email: 'other.user@example.org',
    firstName: 'Otto',
    lastName: 'Second'
};

/** Confidential client that does NOT require PKCE. */
export const CLIENT_NO_PKCE = {
    clientId: 'jahia-oidc-nopkce',
    clientSecret: 'nopkce-client-secret'
};

/** Confidential client that REQUIRES PKCE with S256. */
export const CLIENT_PKCE = {
    clientId: 'jahia-oidc-pkce',
    clientSecret: 'pkce-client-secret'
};

export function browserBaseUrl(): string {
    return Cypress.env('KEYCLOAK_BROWSER_URL');
}

export function internalBaseUrl(): string {
    return Cypress.env('KEYCLOAK_INTERNAL_URL');
}

function realm(): string {
    return Cypress.env('KEYCLOAK_REALM');
}

/** Authorization endpoint — hit by the BROWSER, so it uses the browser-visible host. */
export function authorizationBaseUrl(): string {
    return `${browserBaseUrl()}/realms/${realm()}/protocol/openid-connect/auth`;
}

/** Token endpoint — hit by JAHIA server-side, so it uses the container-visible host. */
export function accessTokenEndpoint(): string {
    return `${internalBaseUrl()}/realms/${realm()}/protocol/openid-connect/token`;
}

/** Userinfo endpoint — hit by JAHIA server-side, so it uses the container-visible host. */
export function profileUrl(): string {
    return `${internalBaseUrl()}/realms/${realm()}/protocol/openid-connect/userinfo`;
}

/**
 * Fill in and submit the Keycloak login form.
 *
 * Keycloak runs on a different port from Jahia, which Cypress treats as a separate
 * origin, so every interaction with its pages has to happen inside cy.origin().
 */
export function loginAtKeycloak(username: string, password: string): void {
    cy.origin(browserBaseUrl(), {args: {username, password}}, ({username, password}) => {
        cy.get('#username').should('be.visible').clear().type(username);
        cy.get('#password').clear().type(password, {log: false});
        cy.get('#kc-login').click();
    });
}

/** Assert the browser is sitting on the Keycloak login form (i.e. the flow started). */
export function assertOnKeycloakLoginForm(): void {
    cy.origin(browserBaseUrl(), () => {
        cy.get('#kc-form-login').should('exist');
    });
}

/**
 * Drop every cookie so neither Jahia nor Keycloak carries a session into the next test.
 *
 * This matters more than it looks: Keycloak keeps its own SSO session, so without this
 * the second test would be silently logged straight back in without ever showing the
 * login form, and would pass for the wrong reason.
 */
export function resetBrowserSessions(): void {
    cy.clearAllCookies();
}
