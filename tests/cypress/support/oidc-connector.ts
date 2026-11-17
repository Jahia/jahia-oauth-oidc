import {callbackUrl} from './urls';
import {accessTokenEndpoint, authorizationBaseUrl, profileUrl} from './keycloak';

/**
 * Configures the OIDC connectors of a site.
 *
 * The connector is stored by jahia-authentication as an OSGi factory configuration
 * (`org.jahia.modules.auth-<siteKey>.cfg`, factory pid `org.jahia.modules.auth`), keyed
 * by the top-level `siteKey` property. Installing the file makes jahia-authentication
 * call back into OidcConnector.validateSettings(), which is what registers the
 * `OidcConnector-<siteKey>` OAuth API — without it the flow cannot start.
 *
 * Every property below is prefixed with the connector service name: OidcConnector.KEY for the
 * original single provider, `OidcConnector-<providerId>` for a named provider.
 */

const CONNECTOR = 'OidcConnector';

/** Mapper property name used by jcr-auth-provider. */
const MAPPER = 'jcrOAuthProvider';

export type ClientAuthentication = 'basic' | 'body';
export type ReturnMode = 'homepage' | 'url' | 'cookie';

export interface OidcConnectorOptions {
    siteKey: string;
    /** A named provider (`OidcConnector-<providerId>`); omitted, the original single-provider connector. */
    providerId?: string;
    /** Shown on the login page. */
    label?: string;
    /** Position on the login page. */
    order?: number;
    enabled?: boolean;
    clientId: string;
    clientSecret: string;
    /** Drives OidcApi -> OidcService, which calls initPKCE() and adds code_challenge. */
    withPKCE: boolean;
    /** Client authentication scheme: basic -> HttpBasicAuthenticationScheme, body -> RequestBodyAuthenticationScheme. */
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
 * Userinfo field -> Jahia user property.
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
    configureOidcConnectors(options.siteKey, [options]);
}

function connectorLines(options: OidcConnectorOptions): string[] {
    const {
        siteKey,
        providerId,
        label,
        order,
        enabled = true,
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
    const connector = providerId ? `${CONNECTOR}-${providerId}` : CONNECTOR;

    const lines = [
        `${connector}.enabled = ${enabled}`,
        // A named provider uses the shared OidcApi. The original connector keeps the API name the
        // 2.0.x UI saved, registered by OidcConnector.validateSettings(): KEY + "-" + siteKey.
        `${connector}.oauthApiName = ${providerId ? 'OidcApi' : `${CONNECTOR}-${siteKey}`}`,
        `${connector}.apiKey = ${clientId}`,
        `${connector}.apiSecret = ${clientSecret}`,
        `${connector}.scope = ${scope}`,
        `${connector}.authentication = ${authentication}`,
        `${connector}.withPKCE = ${withPKCE}`,
        `${connector}.authorizationBaseUrl = ${authorizationBaseUrl()}`,
        `${connector}.accessTokenEndpoint = ${accessTokenEndpoint()}`,
        `${connector}.profileUrl = ${profileUrl()}`,
        `${connector}.callbackUrl = ${callbackUrl(siteKey, page)}`,
        `${connector}.returnMode = ${returnMode}`
    ];

    if (label) {
        lines.push(`${connector}.label = ${label}`);
    }

    if (order !== undefined) {
        lines.push(`${connector}.order = ${order}`);
    }

    if (returnMode === 'url') {
        lines.push(`${connector}.returnUrl = ${returnUrl}`);
    }

    if (returnMode === 'cookie') {
        lines.push(`${connector}.returnCookie = ${returnCookie}`);
    }

    lines.push(
        `${connector}.mappers.${MAPPER}.enabled = true`,
        `${connector}.mappers.${MAPPER}.createUserAtSiteLevel = false`,
        `${connector}.mappers.${MAPPER}.mapping = ${JSON.stringify(MAPPING)}`
    );
    return lines;
}

/** Writes every connector of the site in its one configuration file. */
export function configureOidcConnectors(siteKey: string, connectors: OidcConnectorOptions[]): void {
    const lines = [
        `# OIDC connector configuration for site ${siteKey}`,
        `siteKey = ${siteKey}`,
        ...connectors.flatMap(connectorLines)
    ];

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
    // this connector registers the legacy `OidcConnector-<siteKey>` from validateSettings(), so
    // on a first-ever install it is never registered and .oidc-connect.do fails with a 500.
    // A named provider uses the OidcApi registered at activation and needs no second install.
    //
    // The second install carries a nonce so the properties genuinely differ; Config Admin
    // skips a no-op update, and an identical file would not fire the callback again.
    installConfiguration(configFileName, siteKey, baseContent);
    installConfiguration(
        configFileName,
        siteKey,
        `${baseContent}configNonce = ${Date.now()}\n`
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
