package org.jahiacommunity.modules.oauth.oidc.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;

import java.util.List;
import java.util.stream.Collectors;

@GraphQLTypeExtension(DXGraphQLProvider.Query.class)
public final class OidcQueryExtensions {
    private OidcQueryExtensions() {
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The OIDC providers of a site, by order then label. Requires canSetupJahiaAuth on the site.")
    public static List<GqlOidcProvider> oidcProviders(@GraphQLName("siteKey") @GraphQLNonNull String siteKey) {
        OidcGraphQLSupport.checkCanSetup(siteKey);
        return OidcGraphQLSupport.registry().getProviders(siteKey, false).stream()
                .map(provider -> OidcGraphQLSupport.provider(siteKey, provider.getId()))
                .collect(Collectors.toList());
    }

    @GraphQLField
    @GraphQLDescription("One OIDC provider of a site, or null. Requires canSetupJahiaAuth on the site.")
    public static GqlOidcProvider oidcProvider(@GraphQLName("siteKey") @GraphQLNonNull String siteKey,
                                               @GraphQLName("providerId") @GraphQLNonNull String providerId) {
        OidcGraphQLSupport.checkCanSetup(siteKey);
        return OidcGraphQLSupport.isValidProviderId(providerId) ? OidcGraphQLSupport.provider(siteKey, providerId) : null;
    }
}
