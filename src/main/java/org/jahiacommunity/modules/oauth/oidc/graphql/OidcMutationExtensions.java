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
    @GraphQLDescription("Turns an OIDC provider on or off, and keeps its other settings. Turning it on needs its client ID and endpoint URLs. Requires canSetupJahiaAuth on the site.")
    // Without the name, graphql-java-annotations reads a set prefix as a setter and drops it.
    @GraphQLName("setOidcProviderEnabled")
    public static GqlOidcProvider setOidcProviderEnabled(@GraphQLName("siteKey") @GraphQLNonNull String siteKey,
                                                         @GraphQLName("providerId") @GraphQLNonNull String providerId,
                                                         @GraphQLName("enabled") @GraphQLNonNull Boolean enabled) {
        OidcGraphQLSupport.checkCanSetup(siteKey);
        OidcGraphQLSupport.requireValidProviderId(providerId);
        OidcGraphQLSupport.setEnabled(siteKey, providerId, enabled);
        return OidcGraphQLSupport.provider(siteKey, providerId);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Sends, or stops sending, a visitor who needs to log in on a live page or file of the site to its OIDC login page. Requires canSetupJahiaAuth on the site.")
    // Without the name, graphql-java-annotations reads a set prefix as a setter and drops it.
    @GraphQLName("setOidcLoginPageEnabled")
    public static Boolean setOidcLoginPageEnabled(@GraphQLName("siteKey") @GraphQLNonNull String siteKey,
                                                  @GraphQLName("enabled") @GraphQLNonNull Boolean enabled) {
        OidcGraphQLSupport.checkCanSetup(siteKey);
        OidcGraphQLSupport.run(() -> OidcGraphQLSupport.registry().setLoginPageEnabled(siteKey, enabled));
        return enabled;
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
