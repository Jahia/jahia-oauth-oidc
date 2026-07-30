// Registers cy.waitUntil, which @jahia/cypress relies on for its polling helpers
// (publishAndWaitJobEnding and friends).
import 'cypress-wait-until';
import {jsErrorsLogger} from '@jahia/cypress';

jsErrorsLogger.enable();
jsErrorsLogger.setAllowedJsWarnings([
    'Unsatisfied version',
    'No satisfying version'
]);

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('cypress-terminal-report/src/installLogsCollector')();
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@jahia/cypress/dist/support/registerSupport').registerSupport();

Cypress.on('uncaught:exception', () => false);

/**
 * Park the browser on the Jahia origin before every test.
 *
 * These specs deliberately navigate the browser to Keycloak, which is a different origin
 * (different port). `cy.apollo` issues its GraphQL request from the application under
 * test, so whenever a test starts with the runner still pointed at the Keycloak origin,
 * the very first Apollo call in a setup helper dies with "Network request failed" — which
 * surfaces as an unrelated-looking `Cannot read properties of undefined` inside
 * @jahia/cypress's publication helper.
 *
 * Visiting a Jahia page first makes the origin deterministic regardless of where the
 * previous test left the browser.
 */
beforeEach(() => {
    cy.visit('/cms/login');
});
