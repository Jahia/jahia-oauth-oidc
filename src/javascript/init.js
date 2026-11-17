import {registry} from '@jahia/ui-extender';
import i18next from 'i18next';
import register from './OidcProviders/register';

// Declares the checksums of the locale files, computed by the build, so that the app-shell loads them under a
// versioned URL.
const declareLocaleFiles = () => {
    globalThis.jahia = globalThis.jahia || {};
    globalThis.jahia.localeFiles = {...globalThis.jahia.localeFiles, 'jahia-oauth-oidc': OIDC_LOCALE_FILES};
};

export default function init() {
    registry.add('callback', 'jahia-oauth-oidc', {
        targets: ['jahiaApp-init:60'],
        callback: async () => {
            declareLocaleFiles();
            await i18next.loadNamespaces('jahia-oauth-oidc');
            register();
        }
    });
}
