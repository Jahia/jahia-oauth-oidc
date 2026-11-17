package org.jahiacommunity.modules.oauth.oidc.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;

@GraphQLTypeExtension(DXGraphQLProvider.Mutation.class)
public final class OidcMutationExtensions {
    private OidcMutationExtensions() {
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Creates a disabled OIDC provider. Requires canSetupJahiaAuth on the site.")
    public static GqlOidcProvider createOidcProvider(@GraphQLName("siteKey") @GraphQLNonNull String siteKey,
                                                     @GraphQLName("providerId") @GraphQLNonNull String providerId,
                                                     @GraphQLName("label") String label) {
        OidcGraphQLSupport.checkCanSetup(siteKey);
        OidcGraphQLSupport.requireValidProviderId(providerId);
        OidcGraphQLSupport.run(() -> OidcGraphQLSupport.registry().createProvider(siteKey, providerId, label));
        return OidcGraphQLSupport.provider(siteKey, providerId);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Replaces the settings of an OIDC provider; an empty clientSecret keeps the stored one. Requires canSetupJahiaAuth on the site.")
    public static GqlOidcProvider saveOidcProvider(@GraphQLName("siteKey") @GraphQLNonNull String siteKey,
                                                   @GraphQLName("providerId") @GraphQLNonNull String providerId,
                                                   @GraphQLName("settings") @GraphQLNonNull GqlOidcProviderInput settings) {
        OidcGraphQLSupport.checkCanSetup(siteKey);
        OidcGraphQLSupport.requireValidProviderId(providerId);
        OidcGraphQLSupport.save(siteKey, providerId, settings);
        return OidcGraphQLSupport.provider(siteKey, providerId);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Deletes an OIDC provider and its mappers. Requires canSetupJahiaAuth on the site.")
    public static Boolean deleteOidcProvider(@GraphQLName("siteKey") @GraphQLNonNull String siteKey,
                                             @GraphQLName("providerId") @GraphQLNonNull String providerId) {
        OidcGraphQLSupport.checkCanSetup(siteKey);
        OidcGraphQLSupport.requireValidProviderId(providerId);
        OidcGraphQLSupport.run(() -> OidcGraphQLSupport.registry().deleteProvider(siteKey, providerId));
        return Boolean.TRUE;
    }
}
