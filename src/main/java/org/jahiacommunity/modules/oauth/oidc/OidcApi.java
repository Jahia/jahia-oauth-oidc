package org.jahiacommunity.modules.oauth.oidc;

import com.github.scribejava.apis.openid.OpenIdJsonTokenExtractor;
import com.github.scribejava.core.builder.api.DefaultApi20;
import com.github.scribejava.core.extractors.TokenExtractor;
import com.github.scribejava.core.httpclient.HttpClient;
import com.github.scribejava.core.httpclient.HttpClientConfig;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.oauth.OAuth20Service;

import java.io.OutputStream;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class OidcApi extends DefaultApi20 {
    private static final ConcurrentMap<String, OidcApi> INSTANCES = new ConcurrentHashMap<>();
    private final String accessTokenEndpoint;
    private final String authorizationBaseUrl;
    private final boolean withPKCE;

    public OidcApi(boolean withPKCE, String accessTokenEndpoint, String authorizationBaseUrl) {
        this.accessTokenEndpoint = accessTokenEndpoint;
        this.authorizationBaseUrl = authorizationBaseUrl;
        this.withPKCE = withPKCE;
    }

    public static OidcApi instance(String siteKey, Boolean withPKCE, String accessTokenEndpoint, String authorizationBaseUrl) {
        INSTANCES.put(siteKey, new OidcApi(withPKCE, accessTokenEndpoint, authorizationBaseUrl));
        return INSTANCES.get(siteKey);
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
}
