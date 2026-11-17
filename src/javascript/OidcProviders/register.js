import React from 'react';
import {ApolloProvider} from '@apollo/client';
import {registry} from '@jahia/ui-extender';
import {apolloClient} from '../apolloClient';
import {OidcProvidersAdmin} from './OidcProvidersAdmin';

export default function registerOidcProviders() {
    registry.add('adminRoute', 'jahia-oauth-oidc', {
        targets: ['administration-sites:99'],
        icon: globalThis.jahia.moonstone.toIconComponent('Security'),
        label: 'jahia-oauth-oidc:label.title',
        isSelectable: true,
        requiredPermission: 'canSetupJahiaAuth',
        requireModuleInstalledOnSite: 'jahia-oauth-oidc',
        render: () => React.createElement(ApolloProvider, {client: apolloClient}, React.createElement(OidcProvidersAdmin))
    });
}
