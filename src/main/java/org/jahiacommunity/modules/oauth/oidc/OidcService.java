package org.jahiacommunity.modules.oauth.oidc;

import com.github.scribejava.core.builder.api.DefaultApi20;
import com.github.scribejava.core.httpclient.HttpClient;
import com.github.scribejava.core.httpclient.HttpClientConfig;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.oauth.AccessTokenRequestParams;
import com.github.scribejava.core.oauth.AuthorizationUrlBuilder;
import com.github.scribejava.core.oauth.OAuth20Service;
import org.jahia.osgi.BundleUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.ExecutionException;

public class OidcService extends OAuth20Service {
    private static final Logger logger = LoggerFactory.getLogger(OidcService.class);

    public OidcService(DefaultApi20 api, String apiKey, String apiSecret, String callback, String defaultScope, String responseType, OutputStream debugStream, String userAgent, HttpClientConfig httpClientConfig, HttpClient httpClient) {
        super(api, apiKey, apiSecret, callback, defaultScope, responseType, debugStream, userAgent, httpClientConfig, httpClient);
    }

    @Override
    public AuthorizationUrlBuilder createAuthorizationUrlBuilder() {
        AuthorizationUrlBuilder authorizationUrlBuilder = super.createAuthorizationUrlBuilder();
        authorizationUrlBuilder.initPKCE();
        BundleUtils.getOsgiService(OidcConnector.class, null).setAuthorizationUrlBuilder(authorizationUrlBuilder);
        return authorizationUrlBuilder;
    }

    @Override
    public OAuth2AccessToken getAccessToken(String code) throws IOException, InterruptedException, ExecutionException {
        AuthorizationUrlBuilder authorizationUrlBuilder = BundleUtils.getOsgiService(OidcConnector.class, null).getAuthorizationUrlBuilder();
        if (authorizationUrlBuilder == null) {
            throw new IllegalArgumentException("No authorization url found");
        }
        return getAccessToken(AccessTokenRequestParams.create(code).pkceCodeVerifier(authorizationUrlBuilder.getPkce().getCodeVerifier()));
    }
}
