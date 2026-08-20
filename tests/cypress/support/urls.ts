/**
 * URL helpers for the pages and actions the suite drives.
 *
 * Jahia actions are invoked as `<page-path>.<actionName>.do`. The OIDC connector
 * exposes two: `oidc-connect` (starts the flow) and `oidc-callback` (consumes the
 * authorization code). The README of the module requires the callback URL to end
 * with `.oidc-callback.do`, which the helpers below guarantee.
 */

const RENDER_PREFIX = '/cms/render/live/en';

export function sitePath(siteKey: string): string {
    return `${RENDER_PREFIX}/sites/${siteKey}`;
}

/** Rendered page, e.g. /cms/render/live/en/sites/<key>/oidc.html */
export function pageUrl(siteKey: string, page: string): string {
    return `${sitePath(siteKey)}/${page}.html`;
}

/** Action on a page, e.g. /cms/render/live/en/sites/<key>/oidc.oidc-connect.do */
export function actionUrl(siteKey: string, page: string, action: string): string {
    return `${sitePath(siteKey)}/${page}.${action}.do`;
}

/** The absolute callback URL registered in the connector configuration. */
export function callbackUrl(siteKey: string, page: string): string {
    return `${Cypress.config('baseUrl')}${actionUrl(siteKey, page, 'oidc-callback')}`;
}
