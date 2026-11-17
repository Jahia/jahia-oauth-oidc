import {faker} from '@faker-js/faker';
import gql from 'graphql-tag';
import {createOidcTestSite, deleteOidcTestSite} from '../support/site';
import {sitePath} from '../support/urls';

/**
 * The GraphQL API behind the administration page: oidcProviders, createOidcProvider,
 * saveOidcProvider, setOidcProviderEnabled and deleteOidcProvider.
 */
describe('OIDC providers GraphQL API', () => {
    let siteKey: string;

    const settings = (overrides = {}) => ({
        enabled: true,
        label: 'API provider',
        clientId: 'client',
        clientSecret: 'secret',
        accessTokenEndpoint: 'https://idp.example.org/token',
        authorizationBaseUrl: 'https://idp.example.org/auth',
        callbackUrl: `${Cypress.config('baseUrl')}${sitePath(siteKey)}.oidc-callback.do`,
        ...overrides
    });

    const save = (input: object) => cy.apollo({
        mutation: gql`mutation($siteKey: String!, $settings: InputOidcProviderSettings!) {
            saveOidcProvider(siteKey: $siteKey, providerId: "api", settings: $settings) { id enabled hasClientSecret returnMode returnCookie }
        }`,
        variables: {siteKey, settings: input},
        errorPolicy: 'all'
    });

    beforeEach(() => {
        siteKey = faker.lorem.slug();
        createOidcTestSite(siteKey);
        cy.apollo({
            mutation: gql`mutation($siteKey: String!) { createOidcProvider(siteKey: $siteKey, providerId: "api") { id enabled } }`,
            variables: {siteKey}
        }).its('data.createOidcProvider').should('deep.include', {id: 'api', enabled: false});
    });

    afterEach(() => {
        deleteOidcTestSite(siteKey);
    });

    it('Should refuse a guest', () => {
        // The setup helpers leave an authenticated session behind.
        cy.clearAllCookies();
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            headers: {'Content-Type': 'application/json', Origin: Cypress.config('baseUrl')},
            body: {query: `{ oidcProviders(siteKey: "${siteKey}") { id } }`},
            failOnStatusCode: false
        }).its('body.errors.0.message').should('contain', 'canSetupJahiaAuth');
    });

    it('Should refuse invalid settings', () => {
        save(settings({callbackUrl: 'https://site.example.org/home.html'}))
            .its('errors.0.message').should('contain', '.oidc-callback.do');
        save(settings({logoUrl: 'data:image/svg+xml,<svg/>'}))
            .its('errors.0.message').should('contain', 'logo URL');
        save(settings({clientId: ''}))
            .its('errors.0.message').should('contain', 'client ID');
        save(settings({returnMode: 'cookie'}))
            .its('errors.0.message').should('contain', 'cookie name');
    });

    it('Should keep the stored secret and never return it', () => {
        save(settings({returnMode: 'cookie', returnCookie: 'back'}))
            .its('data.saveOidcProvider').should('deep.include', {enabled: true, hasClientSecret: true, returnCookie: 'back'});

        // An empty secret keeps the stored one; leaving the cookie mode drops the cookie name.
        save(settings({clientSecret: ''}))
            .its('data.saveOidcProvider').should('deep.include', {hasClientSecret: true, returnMode: 'homepage', returnCookie: null});

        cy.apollo({
            query: gql`query($siteKey: String!) { oidcProviders(siteKey: $siteKey) { clientSecret } }`,
            variables: {siteKey},
            errorPolicy: 'all'
        }).its('errors.0.message').should('contain', 'clientSecret');
    });

    it('Should turn a provider on or off and keep its settings', () => {
        const setEnabled = (enabled: boolean) => cy.apollo({
            mutation: gql`mutation($siteKey: String!, $enabled: Boolean!) {
                setOidcProviderEnabled(siteKey: $siteKey, providerId: "api", enabled: $enabled) { enabled label }
            }`,
            variables: {siteKey, enabled},
            errorPolicy: 'all'
        });

        // A provider just created has no client ID yet.
        setEnabled(true).its('errors.0.message').should('contain', 'client ID');

        save(settings({enabled: false}));
        setEnabled(true).its('data.setOidcProviderEnabled').should('deep.include', {enabled: true, label: 'API provider'});
        setEnabled(false).its('data.setOidcProviderEnabled').should('deep.include', {enabled: false, label: 'API provider'});
    });

    it('Should delete a provider', () => {
        cy.apollo({
            mutation: gql`mutation($siteKey: String!) { deleteOidcProvider(siteKey: $siteKey, providerId: "api") }`,
            variables: {siteKey}
        });
        cy.apollo({
            query: gql`query($siteKey: String!) { oidcProviders(siteKey: $siteKey) { id } }`,
            variables: {siteKey},
            fetchPolicy: 'no-cache'
        }).its('data.oidcProviders').should('have.length', 0);
    });
});
