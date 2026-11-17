import {faker} from '@faker-js/faker';
import {
    CLIENT_NO_PKCE,
    KEYCLOAK_USER,
    assertOnKeycloakLoginForm,
    loginAtKeycloak,
    resetBrowserSessions
} from '../support/keycloak';
import {configureOidcConnectors} from '../support/oidc-connector';
import {createOidcTestSite, deleteOidcTestSite, protectPage, setOidcLoginPage} from '../support/site';
import {assertLoggedInWithMappedClaims, assertOnPage} from '../support/assertions';
import {pageUrl, sitePath} from '../support/urls';

/**
 * A guest who asks for a protected page is sent to the OIDC login page of the site, when the site
 * enabled it, and comes back to that page once logged in. Jahia answers a guest with a 401, which
 * its ErrorServlet hands to OidcLoginUrlProvider, only under
 * protectedResourceAccessStrategy=authorizationError, which docker-compose.yml sets.
 */
describe('Protected resources', () => {
    let siteKey: string;

    const loginPage = () => `${sitePath(siteKey)}.oidc-login.html`;

    beforeEach(() => {
        siteKey = faker.lorem.slug();
        createOidcTestSite(siteKey);
        resetBrowserSessions();
        configureOidcConnectors(siteKey, [{
            siteKey,
            providerId: 'keycloak',
            label: 'Keycloak',
            clientId: CLIENT_NO_PKCE.clientId,
            clientSecret: CLIENT_NO_PKCE.clientSecret,
            authentication: 'basic',
            withPKCE: false
        }]);
    });

    afterEach(() => {
        deleteOidcTestSite(siteKey);
    });

    it('Should send a guest from a protected page to the login page, then back to the page', () => {
        // A first login creates the Jahia user of the Keycloak account, named after its sub claim.
        cy.visit(loginPage());
        cy.get('[data-provider="keycloak"]').click();
        loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);
        assertOnPage('home');
        cy.get('[data-test="username"]').invoke('text').then(username => {
            protectPage(siteKey, 'return-target', username.trim());
        });
        setOidcLoginPage(siteKey, true);
        // Every cy.apollo call sends its requests from the browser as root: drop that session only after the last one.
        resetBrowserSessions();
        cy.visit('/cms/login');

        cy.visit(pageUrl(siteKey, 'return-target'));
        cy.location('pathname').should('contain', `/sites/${siteKey}.oidc-login.html`);
        cy.location('search').should('contain', 'redirect=');

        cy.get('[data-provider="keycloak"]').click();
        assertOnKeycloakLoginForm();
        loginAtKeycloak(KEYCLOAK_USER.username, KEYCLOAK_USER.password);
        assertOnPage('return-target');
        assertLoggedInWithMappedClaims(KEYCLOAK_USER);
    });

    it('Should keep the answer of Jahia when the site did not enable the login page', () => {
        protectPage(siteKey, 'return-target', 'root');
        cy.request({url: pageUrl(siteKey, 'return-target'), followRedirect: false, failOnStatusCode: false})
            .its('status').should('eq', 401);
    });
});
