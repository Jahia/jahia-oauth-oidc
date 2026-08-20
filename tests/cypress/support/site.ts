import {createSite, deleteSite, enableModule, publishAndWaitJobEnding} from '@jahia/cypress';

export const TEMPLATE_SET = 'jahia-oauth-oidc-test-module';

/**
 * Stand up an isolated site for one test.
 *
 * jcr-auth-provider has to be enabled alongside the connector: it is the mapper that
 * turns the userinfo claims into a Jahia user. Without it the OAuth flow completes but
 * nobody is ever logged in.
 */
export function createOidcTestSite(siteKey: string): void {
    createSite(siteKey, {
        locale: 'en',
        serverName: 'localhost',
        templateSet: TEMPLATE_SET
    });
    publishAndWaitJobEnding(`/sites/${siteKey}`);
    enableModule('jahia-oauth-oidc', siteKey);
    enableModule('jcr-auth-provider', siteKey);
}

export function deleteOidcTestSite(siteKey: string): void {
    deleteSite(siteKey);
}
