import {faker} from '@faker-js/faker';
import {CLIENT_NO_PKCE, KEYCLOAK_USER, loginAtKeycloak, resetBrowserSessions} from '../support/keycloak';
import {configureOidcConnector} from '../support/oidc-connector';
import {createOidcTestSite, deleteOidcTestSite} from '../support/site';
import {assertLoggedInWithMappedClaims, assertOnPage} from '../support/assertions';
import {actionUrl, pageUrl} from '../support/urls';

/**
 * Where the user lands once the callback has authenticated them.
 *
 * OidcCallbackAction resolves the return URL from the connector's returnMode:
 * an explicit URL, a URL read out of a named cookie, or — when neither applies —
 * the site homepage. Each mode is asserted by which page actually renders, and each
 * case also re-asserts that the user is authenticated, so a redirect that lands on
 * the right page but drops the session cannot pass.
 */
describe('OIDC return modes', () => {
    let siteKey: string;

    beforeEach(() => {
        siteKey = faker.lorem.slug();
        createOidcTestSite(siteKey);
        resetBrowserSessions();
    });

    afterEach(() => {
        deleteOidcTestSite(siteKey);
    });

    it('Should return to the site homepage when returnMode is homepage', () => {
        configureOidcConnector({
            siteKey,
            clientId: CLIENT_NO_PKCE.clientId,
            clientSecret: CLIENT_NO_PKCE.clientSecret,
            authentication: 'basic',
            withPKCE: false,
            returnMode: 'homepage'
        });

        cy.visit(actionUrl(siteKey, 'oidc', 'oidc-connect'));
        loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);

        assertOnPage('home');
        assertLoggedInWithMappedClaims(KEYCLOAK_USER);
    });

    it('Should return to the configured URL when returnMode is url', () => {
        configureOidcConnector({
            siteKey,
            clientId: CLIENT_NO_PKCE.clientId,
            clientSecret: CLIENT_NO_PKCE.clientSecret,
            authentication: 'basic',
            withPKCE: false,
            returnMode: 'url',
            returnUrl: pageUrl(siteKey, 'return-target')
        });

        cy.visit(actionUrl(siteKey, 'oidc', 'oidc-connect'));
        loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);

        assertOnPage('return-target');
        assertLoggedInWithMappedClaims(KEYCLOAK_USER);
    });

    it('Should return to the URL held in the cookie when returnMode is cookie', () => {
        const cookieName = 'oidcReturnTo';

        configureOidcConnector({
            siteKey,
            clientId: CLIENT_NO_PKCE.clientId,
            clientSecret: CLIENT_NO_PKCE.clientSecret,
            authentication: 'basic',
            withPKCE: false,
            returnMode: 'cookie',
            returnCookie: cookieName
        });

        // The cookie has to exist on the Jahia origin before the callback runs, since
        // that is the request OidcCallbackAction reads it from.
        cy.visit(pageUrl(siteKey, 'oidc'));
        cy.setCookie(cookieName, pageUrl(siteKey, 'return-target'));

        cy.visit(actionUrl(siteKey, 'oidc', 'oidc-connect'));
        loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);

        assertOnPage('return-target');
        assertLoggedInWithMappedClaims(KEYCLOAK_USER);
    });

    it('Should fall back to the homepage when returnMode is cookie but the cookie is absent', () => {
        configureOidcConnector({
            siteKey,
            clientId: CLIENT_NO_PKCE.clientId,
            clientSecret: CLIENT_NO_PKCE.clientSecret,
            authentication: 'basic',
            withPKCE: false,
            returnMode: 'cookie',
            returnCookie: 'aCookieNobodySets'
        });

        cy.visit(actionUrl(siteKey, 'oidc', 'oidc-connect'));
        loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);

        assertOnPage('home');
        assertLoggedInWithMappedClaims(KEYCLOAK_USER);
    });
});
