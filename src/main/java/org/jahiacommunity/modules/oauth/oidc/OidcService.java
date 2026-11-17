package org.jahiacommunity.modules.oauth.oidc;

import com.github.scribejava.core.httpclient.HttpClient;
import com.github.scribejava.core.httpclient.HttpClientConfig;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.oauth.AccessTokenRequestParams;
import com.github.scribejava.core.oauth.AuthorizationUrlBuilder;
import com.github.scribejava.core.oauth.OAuth20Service;
import org.jahia.osgi.BundleUtils;

import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.ExecutionException;

public class OidcService extends OAuth20Service {
    private final String connectorName;

    // The parameters of the OAuth20Service constructor this one calls.
    @SuppressWarnings("java:S107")
    public OidcService(OidcApi api, String apiKey, String apiSecret, String callback, String defaultScope, String responseType, OutputStream debugStream, String userAgent, HttpClientConfig httpClientConfig, HttpClient httpClient) {
        super(api, apiKey, apiSecret, callback, defaultScope, responseType, debugStream, userAgent, httpClientConfig, httpClient);
        this.connectorName = api.getConnectorName();
    }

    @Override
    public AuthorizationUrlBuilder createAuthorizationUrlBuilder() {
        AuthorizationUrlBuilder authorizationUrlBuilder = super.createAuthorizationUrlBuilder();
        authorizationUrlBuilder.initPKCE();
        BundleUtils.getOsgiService(OidcConnector.class, null).setAuthorizationUrlBuilder(connectorName, authorizationUrlBuilder);
        return authorizationUrlBuilder;
    }

    @Override
    public OAuth2AccessToken getAccessToken(String code) throws IOException, InterruptedException, ExecutionException {
        AuthorizationUrlBuilder authorizationUrlBuilder = BundleUtils.getOsgiService(OidcConnector.class, null).getAuthorizationUrlBuilder(connectorName);
        if (authorizationUrlBuilder == null) {
            throw new IllegalArgumentException("No authorization url found");
        }
        return getAccessToken(AccessTokenRequestParams.create(code).pkceCodeVerifier(authorizationUrlBuilder.getPkce().getCodeVerifier()));
    }
}
