import {faker} from '@faker-js/faker';
import gql from 'graphql-tag';
import {
    CLIENT_NO_PKCE,
    CLIENT_PKCE,
    KEYCLOAK_USER,
    assertOnKeycloakLoginForm,
    loginAtKeycloak,
    resetBrowserSessions
} from '../support/keycloak';
import {configureOidcConnectors} from '../support/oidc-connector';
import {createOidcTestSite, deleteOidcTestSite} from '../support/site';
import {assertLoggedInWithMappedClaims, assertOnPage} from '../support/assertions';
import {sitePath} from '../support/urls';

/**
 * Several OIDC providers on one site, chosen from the login page that the module serves at
 * /sites/<siteKey>.oidc-login.html.
 *
 * Both providers point to the same Keycloak through two clients, one of which REQUIRES PKCE:
 * a login through it proves that the provider chosen on the page is the one whose settings
 * drive the flow, PKCE verifier included.
 */
describe('Multiple OIDC providers', () => {
    let siteKey: string;

    const loginPageUrl = () => `${sitePath(siteKey)}.oidc-login.html`;
    const connectUrl = (query: string) => `${sitePath(siteKey)}.oidc-connect.do${query}`;

    beforeEach(() => {
        siteKey = faker.lorem.slug();
        createOidcTestSite(siteKey);
        resetBrowserSessions();
        configureOidcConnectors(siteKey, [
            {
                siteKey,
                providerId: 'basic',
                label: 'Keycloak without PKCE',
                order: 2,
                clientId: CLIENT_NO_PKCE.clientId,
                clientSecret: CLIENT_NO_PKCE.clientSecret,
                authentication: 'basic',
                withPKCE: false
            },
            {
                siteKey,
                providerId: 'pkce',
                label: 'Keycloak with PKCE',
                order: 1,
                clientId: CLIENT_PKCE.clientId,
                clientSecret: CLIENT_PKCE.clientSecret,
                authentication: 'body',
                withPKCE: true
            },
            {
                siteKey,
                providerId: 'off',
                label: 'Disabled provider',
                enabled: false,
                clientId: CLIENT_NO_PKCE.clientId,
                clientSecret: CLIENT_NO_PKCE.clientSecret,
                authentication: 'basic',
                withPKCE: false
            }
        ]);
    });

    afterEach(() => {
        deleteOidcTestSite(siteKey);
    });

    it('Should list the enabled providers in their order', () => {
        cy.visit(loginPageUrl());
        cy.get('[data-test="oidc-login-providers"] [data-provider]')
            .then(links => Cypress.$.makeArray(links).map(link => link.getAttribute('data-provider')))
            .should('deep.equal', ['pkce', 'basic']);
        cy.get('[data-provider="pkce"]').should('contain', 'Keycloak with PKCE');
    });

    it('Should drop a provider turned off since the page was cached', () => {
        const providers = () => cy.get('[data-test="oidc-login-providers"] [data-provider]')
            .then(links => Cypress.$.makeArray(links).map(link => link.getAttribute('data-provider')));
        cy.visit(loginPageUrl());
        providers().should('deep.equal', ['pkce', 'basic']);

        cy.apollo({
            mutation: gql`mutation($siteKey: String!) {
                setOidcProviderEnabled(siteKey: $siteKey, providerId: "basic", enabled: false) { id }
            }`,
            variables: {siteKey}
        });
        // Every cy.apollo call sends its requests from the browser as root: drop that session only after the last one.
        resetBrowserSessions();

        cy.visit(loginPageUrl());
        providers().should('deep.equal', ['pkce']);
    });

    ['pkce', 'basic'].forEach(providerId => {
        it(`Should log in through the ${providerId} provider chosen on the login page`, () => {
            cy.visit(loginPageUrl());
            cy.get(`[data-provider="${providerId}"]`).click();
            assertOnKeycloakLoginForm();

            loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);

            assertOnPage('home');
            assertLoggedInWithMappedClaims(KEYCLOAK_USER);
        });
    });

    it('Should refuse a disabled, unknown or ambiguous provider', () => {
        ['?provider=off', '?provider=nope', '?provider=a)(b', ''].forEach(query => {
            cy.request({url: connectUrl(query), followRedirect: false, failOnStatusCode: false})
                .its('status')
                .should('eq', 400);
        });
    });
});
