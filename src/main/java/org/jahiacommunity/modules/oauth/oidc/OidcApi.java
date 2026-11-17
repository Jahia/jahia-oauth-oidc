package org.jahiacommunity.modules.oauth.oidc;

import com.github.scribejava.apis.openid.OpenIdJsonTokenExtractor;
import com.github.scribejava.core.builder.api.DefaultApi20;
import com.github.scribejava.core.extractors.TokenExtractor;
import com.github.scribejava.core.httpclient.HttpClient;
import com.github.scribejava.core.httpclient.HttpClientConfig;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.github.scribejava.core.oauth2.clientauthentication.ClientAuthentication;
import com.github.scribejava.core.oauth2.clientauthentication.HttpBasicAuthenticationScheme;
import com.github.scribejava.core.oauth2.clientauthentication.RequestBodyAuthenticationScheme;

import java.io.OutputStream;

public class OidcApi extends DefaultApi20 {
    private final String connectorName;
    private final String accessTokenEndpoint;
    private final String authorizationBaseUrl;
    private final boolean withPKCE;
    private final String authorization;

    public OidcApi(String connectorName, Boolean withPKCE, String accessTokenEndpoint, String authorizationBaseUrl, String authorization) {
        this.connectorName = connectorName;
        this.accessTokenEndpoint = accessTokenEndpoint;
        this.authorizationBaseUrl = authorizationBaseUrl;
        this.withPKCE = Boolean.TRUE.equals(withPKCE);
        this.authorization = authorization;
    }

    public String getConnectorName() {
        return connectorName;
    }

    @Override
    public OAuth20Service createService(String apiKey, String apiSecret, String callback, String defaultScope, String responseType, OutputStream debugStream, String userAgent, HttpClientConfig httpClientConfig, HttpClient httpClient) {
        if (withPKCE) {
            return new OidcService(this, apiKey, apiSecret, callback, defaultScope, responseType, debugStream, userAgent, httpClientConfig, httpClient);
        }
        return super.createService(apiKey, apiSecret, callback, defaultScope, responseType, debugStream, userAgent, httpClientConfig, httpClient);
    }

    @Override
    public String getAccessTokenEndpoint() {
        return accessTokenEndpoint;
    }

    @Override
    protected String getAuthorizationBaseUrl() {
        return authorizationBaseUrl;
    }

    @Override
    public TokenExtractor<OAuth2AccessToken> getAccessTokenExtractor() {
        return OpenIdJsonTokenExtractor.instance();
    }

    @Override
    public ClientAuthentication getClientAuthentication() {
        if ("basic".equals(authorization)) {
            return HttpBasicAuthenticationScheme.instance();
        }
        if ("body".equals(authorization)) {
            return RequestBodyAuthenticationScheme.instance();
        }
        throw new IllegalStateException("Unsupported client authentication: " + authorization);
    }
}
