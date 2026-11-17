import {faker} from '@faker-js/faker';
import gql from 'graphql-tag';
import {createOidcTestSite, deleteOidcTestSite} from '../support/site';
import {sitePath} from '../support/urls';

/**
 * Administration > Sites > OpenID Connect, the React page that manages the providers, and the
 * card that the Jahia Authentication settings keep for the OIDC connector.
 */
describe('OIDC provider administration', () => {
    let siteKey: string;

    const adminUrl = () => `/jahia/administration/${siteKey}/jahia-oauth-oidc`;
    const card = (providerId: string) => `[data-test="oidc-provider-card"][data-provider="${providerId}"]`;
    const field = (providerId: string, name: string) => `#oidc-${providerId}-${name}`;

    const addProvider = (providerId: string, label: string) => {
        cy.get('#oidc-new-provider-id').type(providerId);
        cy.get('#oidc-new-provider-label').type(label);
        cy.get('[data-test="oidc-add-provider"]').click();
        cy.get(card(providerId)).should('contain', label);
    };

    beforeEach(() => {
        siteKey = faker.lorem.slug();
        createOidcTestSite(siteKey);
        cy.login();
    });

    afterEach(() => {
        cy.logout();
        deleteOidcTestSite(siteKey);
    });

    it('Should add, configure and delete providers', () => {
        cy.on('window:confirm', () => true);
        cy.visit(adminUrl());
        cy.get('[data-test="oidc-providers-admin"]').should('be.visible');
        addProvider('first', 'First provider');
        addProvider('second', 'Second provider');

        // A provider id already used, or malformed, cannot be submitted.
        cy.get('#oidc-new-provider-id').type('first');
        cy.get('[data-test="oidc-add-provider"]').should('be.disabled');
        cy.get('#oidc-new-provider-id').clear();
        cy.get('#oidc-new-provider-id').type('NotValid');
        cy.get('[data-test="oidc-add-provider"]').should('be.disabled');
        cy.get('#oidc-new-provider-id').clear();

        // Open the first provider. The server refuses an invalid callback URL.
        cy.get(card('first')).find('button').first().click();
        cy.get(card('first')).within(() => {
            cy.get(field('first', 'clientId')).type('client');
            cy.get(field('first', 'clientSecret')).type('secret');
            cy.get(field('first', 'accessTokenEndpoint')).type('https://idp.example.org/token');
            cy.get(field('first', 'authorizationBaseUrl')).type('https://idp.example.org/auth');
            cy.get(field('first', 'callbackUrl')).type('https://site.example.org/home.html');
            cy.get('[data-test="oidc-save-provider"]').click();
            cy.get('[data-test="oidc-provider-error"]').should('contain', '.oidc-callback.do');

            cy.get(field('first', 'callbackUrl')).clear();
            cy.get(field('first', 'callbackUrl')).type(`${Cypress.config('baseUrl')}${sitePath(siteKey)}.oidc-callback.do`);
            cy.get('[data-test="oidc-save-provider"]').click();
            cy.get('[data-test="oidc-provider-saved"]').should('be.visible');
        });

        // A configured provider is turned on from its header; an incomplete one cannot be.
        cy.get(card('first')).find('[data-test="oidc-provider-enabled"]').click();
        cy.get(card('first')).find('[data-test="oidc-provider-enabled"] input').should('be.checked');
        cy.get(card('second')).find('[data-test="oidc-provider-enabled"]').click();
        cy.get(card('second')).find('[data-test="oidc-provider-enabled-error"]').should('contain', 'client ID');

        // The settings survive a reload, and the stored secret is never sent back.
        cy.reload();
        cy.get('[data-test="oidc-provider-card"]').should('have.length', 2);
        cy.get(card('first')).find('[data-test="oidc-provider-enabled"] input').should('be.checked');
        cy.get(card('second')).find('[data-test="oidc-provider-enabled"] input').should('not.be.checked');
        cy.get(card('first')).find('button').first().click();
        cy.get(field('first', 'clientId')).should('have.value', 'client');
        cy.get(field('first', 'clientSecret')).should('have.value', '');
        cy.get(card('first')).should('contain', 'A secret is stored');

        cy.get(card('second')).find('button').first().click();
        cy.get(card('second')).find('[data-test="oidc-delete-provider"]').click();
        cy.get(card('second')).should('not.exist');
        cy.reload();
        cy.get('[data-test="oidc-provider-card"]').should('have.length', 1);
    });

    it('Should list the providers on the Jahia Authentication card', () => {
        cy.apollo({
            mutation: gql`mutation($siteKey: String!) {
                createOidcProvider(siteKey: $siteKey, providerId: "listed", label: "Listed provider") { id }
            }`,
            variables: {siteKey}
        });

        cy.visit(`/cms/editframe/default/en/sites/${siteKey}.auth-connector-site-settings.html?redirect=false`);
        cy.get('[data-test="oidc-link-card"]').within(() => {
            cy.get('[data-provider="listed"]').should('contain', 'Listed provider').and('contain', 'Disabled');
            cy.get('[data-provider="listed"] [href]').should('have.attr', 'href', '#/mappers/OidcConnector-listed');
            cy.get('[data-test="oidc-manage-providers"]').should('have.attr', 'href').and('contain', `/jahia/administration/${siteKey}/jahia-oauth-oidc`);
        });
    });
});
