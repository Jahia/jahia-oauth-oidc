package org.jahiacommunity.modules.oauth.oidc.graphql;

import graphql.annotations.annotationTypes.GraphQLConstructor;
import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;

@GraphQLName("OidcProviderSettings")
@GraphQLDescription("The settings of an OpenID Connect provider")
public class GqlOidcProviderInput {
    private final Boolean enabled;
    private final String label;
    private final String logoUrl;
    private final Integer order;
    private final String clientId;
    private final String clientSecret;
    private final String scope;
    private final String authentication;
    private final Boolean withPKCE;
    private final String accessTokenEndpoint;
    private final String authorizationBaseUrl;
    private final String callbackUrl;
    private final String profileUrl;
    private final String returnMode;
    private final String returnUrl;
    private final String returnCookie;

    @GraphQLConstructor
    @SuppressWarnings("java:S107")
    public GqlOidcProviderInput(@GraphQLName("enabled") Boolean enabled,
                                @GraphQLName("label") String label,
                                @GraphQLName("logoUrl") String logoUrl,
                                @GraphQLName("order") Integer order,
                                @GraphQLName("clientId") String clientId,
                                @GraphQLName("clientSecret") @GraphQLDescription("Empty keeps the stored secret") String clientSecret,
                                @GraphQLName("scope") String scope,
                                @GraphQLName("authentication") @GraphQLDescription("basic or body") String authentication,
                                @GraphQLName("withPKCE") Boolean withPKCE,
                                @GraphQLName("accessTokenEndpoint") String accessTokenEndpoint,
                                @GraphQLName("authorizationBaseUrl") String authorizationBaseUrl,
                                @GraphQLName("callbackUrl") String callbackUrl,
                                @GraphQLName("profileUrl") String profileUrl,
                                @GraphQLName("returnMode") @GraphQLDescription("homepage, url or cookie") String returnMode,
                                @GraphQLName("returnUrl") String returnUrl,
                                @GraphQLName("returnCookie") String returnCookie) {
        this.enabled = enabled;
        this.label = label;
        this.logoUrl = logoUrl;
        this.order = order;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.scope = scope;
        this.authentication = authentication;
        this.withPKCE = withPKCE;
        this.accessTokenEndpoint = accessTokenEndpoint;
        this.authorizationBaseUrl = authorizationBaseUrl;
        this.callbackUrl = callbackUrl;
        this.profileUrl = profileUrl;
        this.returnMode = returnMode;
        this.returnUrl = returnUrl;
        this.returnCookie = returnCookie;
    }

    @GraphQLField
    public Boolean getEnabled() {
        return enabled;
    }

    @GraphQLField
    public String getLabel() {
        return label;
    }

    @GraphQLField
    public String getLogoUrl() {
        return logoUrl;
    }

    @GraphQLField
    public Integer getOrder() {
        return order;
    }

    @GraphQLField
    public String getClientId() {
        return clientId;
    }

    @GraphQLField
    public String getClientSecret() {
        return clientSecret;
    }

    @GraphQLField
    public String getScope() {
        return scope;
    }

    @GraphQLField
    public String getAuthentication() {
        return authentication;
    }

    @GraphQLField
    public Boolean getWithPKCE() {
        return withPKCE;
    }

    @GraphQLField
    public String getAccessTokenEndpoint() {
        return accessTokenEndpoint;
    }

    @GraphQLField
    public String getAuthorizationBaseUrl() {
        return authorizationBaseUrl;
    }

    @GraphQLField
    public String getCallbackUrl() {
        return callbackUrl;
    }

    @GraphQLField
    public String getProfileUrl() {
        return profileUrl;
    }

    @GraphQLField
    public String getReturnMode() {
        return returnMode;
    }

    @GraphQLField
    public String getReturnUrl() {
        return returnUrl;
    }

    @GraphQLField
    public String getReturnCookie() {
        return returnCookie;
    }
}
