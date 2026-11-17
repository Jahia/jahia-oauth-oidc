import {gql} from '@apollo/client';

const PROVIDER_FIELDS = gql`
    fragment OidcProviderFields on OidcProvider {
        id
        connectorServiceName
        label
        logoUrl
        order
        enabled
        clientId
        hasClientSecret
        scope
        authentication
        withPKCE
        accessTokenEndpoint
        authorizationBaseUrl
        callbackUrl
        profileUrl
        returnMode
        returnUrl
        returnCookie
    }
`;

export const GET_PROVIDERS = gql`
    query oidcProviders($siteKey: String!) {
        oidcLoginPageEnabled(siteKey: $siteKey)
        oidcProviders(siteKey: $siteKey) {
            ...OidcProviderFields
        }
    }
    ${PROVIDER_FIELDS}
`;

export const CREATE_PROVIDER = gql`
    mutation createOidcProvider($siteKey: String!, $providerId: String!, $label: String) {
        createOidcProvider(siteKey: $siteKey, providerId: $providerId, label: $label) {
            ...OidcProviderFields
        }
    }
    ${PROVIDER_FIELDS}
`;

export const SAVE_PROVIDER = gql`
    mutation saveOidcProvider($siteKey: String!, $providerId: String!, $settings: InputOidcProviderSettings!) {
        saveOidcProvider(siteKey: $siteKey, providerId: $providerId, settings: $settings) {
            ...OidcProviderFields
        }
    }
    ${PROVIDER_FIELDS}
`;

export const DELETE_PROVIDER = gql`
    mutation deleteOidcProvider($siteKey: String!, $providerId: String!) {
        deleteOidcProvider(siteKey: $siteKey, providerId: $providerId)
    }
`;

export const SET_LOGIN_PAGE = gql`
    mutation setOidcLoginPageEnabled($siteKey: String!, $enabled: Boolean!) {
        setOidcLoginPageEnabled(siteKey: $siteKey, enabled: $enabled)
    }
`;
