import {faker} from '@faker-js/faker';
import {
    CLIENT_NO_PKCE,
    CLIENT_PKCE,
    KEYCLOAK_USER,
    assertOnKeycloakLoginForm,
    loginAtKeycloak,
    resetBrowserSessions
} from '../support/keycloak';
import {ClientAuthentication, configureOidcConnector} from '../support/oidc-connector';
import {createOidcTestSite, deleteOidcTestSite} from '../support/site';
import {assertIsGuest, assertLoggedInWithMappedClaims, assertOnPage} from '../support/assertions';
import {actionUrl, pageUrl} from '../support/urls';

/**
 * The authorization-code flow, end to end, against a real Keycloak.
 *
 * Two dimensions are exercised, because the connector implements both of them itself
 * (OidcApi.getClientAuthentication and OidcApi.createService):
 *
 *   - how the client authenticates at the token endpoint: HTTP Basic vs request body
 *   - whether PKCE is used
 *
 * The PKCE cases run against a Keycloak client configured to REQUIRE S256, so a passing
 * test proves a code_challenge was really sent rather than merely tolerated.
 */

interface Flow {
    name: string;
    client: {clientId: string; clientSecret: string};
    authentication: ClientAuthentication;
    withPKCE: boolean;
}

const flows: Flow[] = [
    {
        name: 'HTTP Basic client authentication, no PKCE',
        client: CLIENT_NO_PKCE,
        authentication: 'basic',
        withPKCE: false
    },
    {
        name: 'request-body client authentication, no PKCE',
        client: CLIENT_NO_PKCE,
        authentication: 'body',
        withPKCE: false
    },
    {
        name: 'HTTP Basic client authentication, with PKCE (S256)',
        client: CLIENT_PKCE,
        authentication: 'basic',
        withPKCE: true
    },
    {
        name: 'request-body client authentication, with PKCE (S256)',
        client: CLIENT_PKCE,
        authentication: 'body',
        withPKCE: true
    }
];

describe('OIDC authentication flows', () => {
    let siteKey: string;

    beforeEach(() => {
        siteKey = faker.lorem.slug();
        createOidcTestSite(siteKey);
        resetBrowserSessions();
    });

    afterEach(() => {
        deleteOidcTestSite(siteKey);
    });

    flows.forEach(flow => {
        it(`Should authenticate the user with ${flow.name}`, () => {
            configureOidcConnector({
                siteKey,
                clientId: flow.client.clientId,
                clientSecret: flow.client.clientSecret,
                authentication: flow.authentication,
                withPKCE: flow.withPKCE
            });

            // Starting point: nobody is logged in.
            cy.visit(pageUrl(siteKey, 'oidc'));
            assertIsGuest();

            // .oidc-connect.do answers with a 302 to Keycloak (ActionResult carries a URL
            // and no JSON), so the browser simply follows it to the login form.
            cy.visit(actionUrl(siteKey, 'oidc', 'oidc-connect'));
            assertOnKeycloakLoginForm();

            loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);

            // Keycloak redirects to .oidc-callback.do, which exchanges the code, runs the
            // mappers and redirects to the site home with ?site=<key> for the SSO valve.
            assertOnPage('home');
            assertLoggedInWithMappedClaims(KEYCLOAK_USER);
        });
    });

    it('Should refuse the flow when the client requires PKCE and the connector does not send it', () => {
        // Same PKCE-enforcing client, but withPKCE=false, so OidcApi builds a plain
        // OAuth20Service with no code_challenge. Keycloak must reject the request before
        // it ever shows a login form.
        configureOidcConnector({
            siteKey,
            clientId: CLIENT_PKCE.clientId,
            clientSecret: CLIENT_PKCE.clientSecret,
            authentication: 'basic',
            withPKCE: false
        });

        // Keycloak does not render an error page here: per OAuth it redirects the error
        // back to the client, so the chain ends on .oidc-callback.do with an `error`
        // parameter and no `code` — which the callback rejects with a 400. Driven with
        // cy.request so the whole redirect chain, including that final status, is visible.
        cy.request({
            url: actionUrl(siteKey, 'oidc', 'oidc-connect'),
            followRedirect: true,
            failOnStatusCode: false
        }).then(response => {
            expect(response.redirects.join('\n')).to.include('error=invalid_request');
            expect(response.status).to.eq(400);
        });

        // And the user is still a guest back on the site.
        cy.visit(pageUrl(siteKey, 'oidc'));
        assertIsGuest();
    });
});
