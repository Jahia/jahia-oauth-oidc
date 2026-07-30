import {defineConfig} from 'cypress';

export default defineConfig({
    screenshotsFolder: './results/screenshots',
    videosFolder: './results/videos',
    viewportWidth: 1366,
    viewportHeight: 768,
    watchForFileChanges: false,
    e2e: {
        setupNodeEvents(on, config) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('./cypress/plugins/index.js')(on, config);
        },
        excludeSpecPattern: '*.ignore.ts',
        baseUrl: process.env.JAHIA_URL || 'http://localhost:8080'
    },
    env: {
        // Keycloak is reached under two different hosts, on purpose:
        //
        //  - KEYCLOAK_BROWSER_URL is where the *browser* is redirected for the
        //    authorization endpoint (it runs on the host).
        //  - KEYCLOAK_INTERNAL_URL is where *Jahia* calls the token and userinfo
        //    endpoints from (it runs inside a container).
        //
        // The OIDC connector configures these as three independent properties
        // (authorizationBaseUrl / accessTokenEndpoint / profileUrl), so the split is
        // expressible directly. Both containers are in the same compose stack, so Jahia
        // reaches the IdP by service name. Keycloak pins its issuer (see
        // docker-compose.yml) so the two hosts still agree on the token's `iss`.
        KEYCLOAK_BROWSER_URL: process.env.KEYCLOAK_BROWSER_URL || 'http://localhost:8081',
        KEYCLOAK_INTERNAL_URL: process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8081',
        KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'jahia-oidc-test'
    }
});
