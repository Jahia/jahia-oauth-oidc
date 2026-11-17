package org.jahiacommunity.modules.oauth.oidc.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.math.NumberUtils;
import org.jahiacommunity.modules.oauth.oidc.OidcConnector;

import java.util.Map;

@GraphQLName("OidcProvider")
@GraphQLDescription("An OpenID Connect provider of a site. The client secret is never returned.")
public class GqlOidcProvider {
    private final String connectorName;
    private final Map<String, String> values;

    GqlOidcProvider(String connectorName, Map<String, String> values) {
        this.connectorName = connectorName;
        this.values = values;
    }

    private String value(String name) {
        return StringUtils.trimToNull(values.get(name));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The id of the provider in the login URL, ?provider=<id>; default for the 2.x single provider")
    public String getId() {
        return OidcConnector.toProviderId(connectorName);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The connector name in jahia-authentication, which names its mappers")
    public String getConnectorServiceName() {
        return connectorName;
    }

    @GraphQLField
    @GraphQLNonNull
    public String getLabel() {
        return StringUtils.defaultIfBlank(value(OidcGraphQLSupport.LABEL), getId());
    }

    @GraphQLField
    public String getLogoUrl() {
        return value(OidcGraphQLSupport.LOGO_URL);
    }

    @GraphQLField
    @GraphQLNonNull
    public Integer getOrder() {
        return NumberUtils.toInt(value(OidcGraphQLSupport.ORDER), 0);
    }

    @GraphQLField
    @GraphQLNonNull
    public Boolean getEnabled() {
        return Boolean.parseBoolean(value(OidcGraphQLSupport.ENABLED));
    }

    @GraphQLField
    public String getClientId() {
        return value(OidcGraphQLSupport.CLIENT_ID);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Whether a client secret is stored")
    public Boolean getHasClientSecret() {
        String secret = value(OidcGraphQLSupport.CLIENT_SECRET);
        return secret != null && !OidcGraphQLSupport.UNUSED_SECRET.equals(secret);
    }

    @GraphQLField
    public String getScope() {
        return value(OidcGraphQLSupport.SCOPE);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("basic or body")
    public String getAuthentication() {
        return StringUtils.defaultIfBlank(value(OidcGraphQLSupport.AUTHENTICATION), "basic");
    }

    @GraphQLField
    @GraphQLNonNull
    public Boolean getWithPKCE() {
        return Boolean.parseBoolean(value(OidcGraphQLSupport.WITH_PKCE));
    }

    @GraphQLField
    public String getAccessTokenEndpoint() {
        return value(OidcGraphQLSupport.ACCESS_TOKEN_ENDPOINT);
    }

    @GraphQLField
    public String getAuthorizationBaseUrl() {
        return value(OidcGraphQLSupport.AUTHORIZATION_BASE_URL);
    }

    @GraphQLField
    public String getCallbackUrl() {
        return value(OidcGraphQLSupport.CALLBACK_URL);
    }

    @GraphQLField
    public String getProfileUrl() {
        return value(OidcGraphQLSupport.PROFILE_URL);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("homepage, url or cookie")
    public String getReturnMode() {
        return StringUtils.defaultIfBlank(value(OidcGraphQLSupport.RETURN_MODE), "homepage");
    }

    @GraphQLField
    public String getReturnUrl() {
        return value(OidcGraphQLSupport.RETURN_URL);
    }

    @GraphQLField
    public String getReturnCookie() {
        return value(OidcGraphQLSupport.RETURN_COOKIE);
    }
}
