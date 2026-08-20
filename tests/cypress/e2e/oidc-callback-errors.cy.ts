import {faker} from '@faker-js/faker';
import {CLIENT_NO_PKCE, resetBrowserSessions} from '../support/keycloak';
import {configureOidcConnector} from '../support/oidc-connector';
import {createOidcTestSite, deleteOidcTestSite} from '../support/site';
import {assertIsGuest} from '../support/assertions';
import {actionUrl, pageUrl} from '../support/urls';

/**
 * The callback endpoint on its own — it is reachable unauthenticated
 * (setRequireAuthenticatedUser(false)) and takes an attacker-supplied `code`, so it has
 * to reject anything it cannot honour instead of half-authenticating someone.
 */
describe('OIDC callback error handling', () => {
    let siteKey: string;

    beforeEach(() => {
        siteKey = faker.lorem.slug();
        createOidcTestSite(siteKey);
        resetBrowserSessions();
        configureOidcConnector({
            siteKey,
            clientId: CLIENT_NO_PKCE.clientId,
            clientSecret: CLIENT_NO_PKCE.clientSecret,
            authentication: 'basic',
            withPKCE: false
        });
    });

    afterEach(() => {
        deleteOidcTestSite(siteKey);
    });

    it('Should reject a callback that carries no authorization code', () => {
        cy.request({
            url: actionUrl(siteKey, 'oidc', 'oidc-callback'),
            failOnStatusCode: false
        }).its('status').should('eq', 400);
    });

    it('Should reject a callback whose authorization code is blank', () => {
        cy.request({
            url: `${actionUrl(siteKey, 'oidc', 'oidc-callback')}?code=`,
            failOnStatusCode: false
        }).its('status').should('eq', 400);
    });

    it('Should not authenticate anyone when the authorization code is invalid', () => {
        // Keycloak rejects the code at the token endpoint, so the action falls through
        // to BAD_REQUEST and no session is established.
        cy.request({
            url: `${actionUrl(siteKey, 'oidc', 'oidc-callback')}?code=${faker.string.uuid()}`,
            failOnStatusCode: false
        }).its('status').should('eq', 400);

        cy.visit(pageUrl(siteKey, 'oidc'));
        assertIsGuest();
    });
});
