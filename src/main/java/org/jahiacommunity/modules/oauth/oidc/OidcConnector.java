package org.jahiacommunity.modules.oauth.oidc;

import com.github.scribejava.core.oauth.AuthorizationUrlBuilder;
import org.apache.commons.lang3.StringUtils;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.ConnectorPropertyInfo;
import org.jahia.modules.jahiaauth.service.ConnectorService;
import org.jahia.modules.jahiaauth.service.JahiaAuthConstants;
import org.jahia.modules.jahiaauth.service.SettingsService;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthService;
import org.jahia.modules.jahiaoauth.service.OAuthConnectorService;
import org.jahia.services.sites.JahiaSitesService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.context.request.RequestContextHolder;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component(service = {OidcConnector.class, OAuthConnectorService.class, ConnectorService.class}, property = {JahiaAuthConstants.CONNECTOR_SERVICE_NAME + "=" + OidcConnector.KEY}, immediate = true)
public class OidcConnector implements OAuthConnectorService {
    private static final Logger logger = LoggerFactory.getLogger(OidcConnector.class);

    public static final String KEY = "OidcConnector";

    private final Map<String, AuthorizationUrlBuilder> authorizationUrlBuilders;

    public OidcConnector() {
        authorizationUrlBuilders = new HashMap<>();
    }

    @Reference
    private JahiaOAuthService jahiaOAuthService;
    @Reference
    private SettingsService settingsService;
    @Reference
    private JahiaSitesService jahiaSitesService;

    @Activate
    private void onActivate() {
        jahiaSitesService.getSitesNames().forEach(siteName -> {
            ConnectorConfig connectorConfig = settingsService.getConnectorConfig(siteName, KEY);
            if (connectorConfig != null) {
                try {
                    connectorConfig.getValues().setProperty(JahiaAuthConstants.PROPERTY_SITE_KEY, siteName);
                    validateSettings(connectorConfig);
                } catch (IOException e) {
                    logger.error("", e);
                }
            }
        });
    }

    @Override
    public void validateSettings(ConnectorConfig connectorConfig) throws IOException {
        String siteKey = connectorConfig.getSiteKey();
        jahiaOAuthService.addOAuthDefaultApi20(KEY + "-" + siteKey, config -> OidcApi.instance(
                siteKey,
                config.getBooleanProperty("withPKCE"),
                config.getProperty("accessTokenEndpoint"),
                config.getProperty("authorizationBaseUrl"),
                config.getProperty("authentication")));
    }

    @Deactivate
    private void onDeactivate() {
        jahiaSitesService.getSitesNames().forEach(siteName -> jahiaOAuthService.removeOAuthDefaultApi20(KEY + "-" + siteName));
    }

    @Override
    public String getProtectedResourceUrl(ConnectorConfig connectorConfig) {
        if (StringUtils.isNotBlank(connectorConfig.getProperty("profileUrl"))) {
            return connectorConfig.getProperty("profileUrl");
        }
        return null;
    }

    @Override
    public List<String> getProtectedResourceUrls(ConnectorConfig connectorConfig) {
        String profileUrl = getProtectedResourceUrl(connectorConfig);
        return profileUrl == null ? Collections.emptyList() : Collections.singletonList(profileUrl);
    }

    @Override
    public List<ConnectorPropertyInfo> getAvailableProperties() {
        return Collections.emptyList();
    }

    public void setAuthorizationUrlBuilder(AuthorizationUrlBuilder authorizationUrlBuilder) {
        authorizationUrlBuilders.put(RequestContextHolder.getRequestAttributes().getSessionId(), authorizationUrlBuilder);
    }

    public AuthorizationUrlBuilder getAuthorizationUrlBuilder() {
        return authorizationUrlBuilders.get(RequestContextHolder.getRequestAttributes().getSessionId());
    }
}
