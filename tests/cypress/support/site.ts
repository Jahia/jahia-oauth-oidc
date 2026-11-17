import gql from 'graphql-tag';
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

/**
 * Restrict a live page of the site to one user: reader for that user, ACL inheritance broken,
 * then the page republished. A guest gets a 401 for it once Jahia runs with
 * protectedResourceAccessStrategy=authorizationError (see docker-compose.yml), a 404 otherwise.
 */
export function protectPage(siteKey: string, page: string, username: string): void {
    const path = `/sites/${siteKey}/${page}`;
    cy.apollo({
        mutation: gql`mutation($path: String!, $username: String!) {
            jcr { mutateNode(pathOrId: $path) { grantRoles(roleNames: ["reader"], principalType: USER, principalName: $username) } }
        }`,
        variables: {path, username}
    });
    cy.apollo({
        mutation: gql`mutation($path: String!) {
            jcr { mutateNode(pathOrId: $path) { mutateProperty(name: "j:inherit") { setValue(value: "false") } } }
        }`,
        variables: {path: `${path}/j:acl`}
    });
    publishAndWaitJobEnding(path);
}

/** Send, or stop sending, a guest who must log in on the site to its OIDC login page. */
export function setOidcLoginPage(siteKey: string, enabled: boolean): void {
    cy.apollo({
        mutation: gql`mutation($siteKey: String!, $enabled: Boolean!) { setOidcLoginPageEnabled(siteKey: $siteKey, enabled: $enabled) }`,
        variables: {siteKey, enabled}
    });
}
