import {callbackUrl} from './urls';
import {accessTokenEndpoint, authorizationBaseUrl, profileUrl} from './keycloak';

/**
 * Configures the OIDC connector for a site.
 *
 * The connector is stored by jahia-authentication as an OSGi factory configuration
 * (`org.jahia.modules.auth-<siteKey>.cfg`, factory pid `org.jahia.modules.auth`), keyed
 * by the top-level `siteKey` property. Installing the file makes jahia-authentication
 * call back into OidcConnector.validateSettings(), which is what registers the
 * `OidcConnector-<siteKey>` OAuth API — without it the flow cannot start.
 *
 * Every property below is prefixed with the connector service name (OidcConnector.KEY).
 */

const CONNECTOR = 'OidcConnector';

/** Mapper property name used by jcr-auth-provider. */
const MAPPER = 'jcrOAuthProvider';

export type ClientAuthentication = 'basic' | 'body';
export type ReturnMode = 'homepage' | 'url' | 'cookie';

export interface OidcConnectorOptions {
    siteKey: string;
    clientId: string;
    clientSecret: string;
    /** Drives OidcApi -> OidcService, which calls initPKCE() and adds code_challenge. */
    withPKCE: boolean;
    /** basic -> HttpBasicAuthenticationScheme, body -> RequestBodyAuthenticationScheme. */
    authentication: ClientAuthentication;
    /** Page carrying the connect + callback actions. Defaults to the 'oidc' test page. */
    page?: string;
    returnMode?: ReturnMode;
    /** Required when returnMode is 'url'. */
    returnUrl?: string;
    /** Required when returnMode is 'cookie' — the cookie holding the target URL. */
    returnCookie?: string;
    /**
     * OAuth scope. Space separated, per RFC 6749 — note the module README documents
     * this as comma separated, which Keycloak would read as one unknown scope.
     */
    scope?: string;
}

/**
 * userinfo field -> Jahia user property.
 *
 * OidcConnector.getAvailableProperties() returns an empty list, so nothing is resolved
 * from a connector-declared schema: jahia-oauth falls back to a top-level lookup on the
 * userinfo JSON using these connector property names. They must therefore be the raw
 * OIDC claim names Keycloak emits, not friendly aliases.
 */
const MAPPING = [
    {
        connector: {valueType: 'string', name: 'sub'},
        editable: false,
        mapper: {valueType: 'string', name: 'ssoLoginId', mandatory: true}
    },
    {
        connector: {valueType: 'string', name: 'email'},
        editable: false,
        mapper: {valueType: 'email', name: 'j:email', mandatory: false}
    },
    {
        connector: {valueType: 'string', name: 'given_name'},
        editable: false,
        mapper: {valueType: 'string', name: 'j:firstName', mandatory: false}
    },
    {
        connector: {valueType: 'string', name: 'family_name'},
        editable: false,
        mapper: {valueType: 'string', name: 'j:lastName', mandatory: false}
    }
];

export function configureOidcConnector(options: OidcConnectorOptions): void {
    const {
        siteKey,
        clientId,
        clientSecret,
        withPKCE,
        authentication,
        page = 'oidc',
        returnMode = 'homepage',
        returnUrl,
        returnCookie,
        scope = 'openid profile email'
    } = options;

    const lines = [
        `# OIDC connector configuration for site ${siteKey}`,
        `siteKey = ${siteKey}`,
        `${CONNECTOR}.enabled = true`,
        // Must match the api registered by OidcConnector.validateSettings(): KEY + "-" + siteKey
        `${CONNECTOR}.oauthApiName = ${CONNECTOR}-${siteKey}`,
        `${CONNECTOR}.apiKey = ${clientId}`,
        `${CONNECTOR}.apiSecret = ${clientSecret}`,
        `${CONNECTOR}.scope = ${scope}`,
        `${CONNECTOR}.authentication = ${authentication}`,
        `${CONNECTOR}.withPKCE = ${withPKCE}`,
        `${CONNECTOR}.authorizationBaseUrl = ${authorizationBaseUrl()}`,
        `${CONNECTOR}.accessTokenEndpoint = ${accessTokenEndpoint()}`,
        `${CONNECTOR}.profileUrl = ${profileUrl()}`,
        `${CONNECTOR}.callbackUrl = ${callbackUrl(siteKey, page)}`,
        `${CONNECTOR}.returnMode = ${returnMode}`
    ];

    if (returnMode === 'url') {
        lines.push(`${CONNECTOR}.returnUrl = ${returnUrl}`);
    }

    if (returnMode === 'cookie') {
        lines.push(`${CONNECTOR}.returnCookie = ${returnCookie}`);
    }

    lines.push(
        `${CONNECTOR}.mappers.${MAPPER}.enabled = true`,
        `${CONNECTOR}.mappers.${MAPPER}.createUserAtSiteLevel = false`,
        `${CONNECTOR}.mappers.${MAPPER}.mapping = ${JSON.stringify(MAPPING)}`
    );

    const configFileName = `org.jahia.modules.auth-${siteKey}.cfg`;
    const baseContent = lines.join('\n') + '\n';

    cy.log(`Installing OIDC connector config for ${siteKey}:\n${baseContent}`);

    // Installed TWICE, deliberately.
    //
    // jahia-authentication only registers the connector's OAuth API on an *update* of a
    // configuration it already knows: SettingsServiceImpl.updated() calls
    // ConnectorService.validateSettings() in its else-branch only, and the first callback
    // for a brand-new pid takes the other branch. For most jahia-oauth connectors that is
    // invisible, because their APIs are registered statically at service activation — but
    // this connector registers `OidcConnector-<siteKey>` from validateSettings(), so on a
    // first-ever install it is never registered and .oidc-connect.do fails with a 500.
    //
    // The second install carries a nonce so the properties genuinely differ; Config Admin
    // skips a no-op update, and an identical file would not fire the callback again.
    installConfiguration(configFileName, siteKey, baseContent);
    installConfiguration(
        configFileName,
        siteKey,
        `${baseContent}${CONNECTOR}.configNonce = ${Date.now()}\n`
    );
}

function installConfiguration(configFileName: string, siteKey: string, configContent: string): void {
    cy.runProvisioningScript({
        script: {
            fileContent: `- installConfiguration: "${configFileName}"`,
            fileName: `install-oidc-config-${siteKey}.yml`,
            type: 'application/yaml'
        },
        files: [
            {
                fileContent: configContent,
                fileName: configFileName,
                type: 'text/plain'
            }
        ]
    });
}
