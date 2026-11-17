package org.jahiacommunity.modules.oauth.oidc;

import com.github.scribejava.core.oauth.AuthorizationUrlBuilder;
import org.apache.commons.lang3.StringUtils;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.ConnectorPropertyInfo;
import org.jahia.modules.jahiaauth.service.SettingsService;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthAPIBuilder;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthService;
import org.jahia.modules.jahiaoauth.service.OAuthConnectorService;
import org.jahia.services.sites.JahiaSitesService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * The OIDC connector. One instance serves every OIDC provider of every site: each provider is a connector
 * name, {@link #KEY} for the original single provider and {@code OidcConnector-<providerId>} for the others.
 * {@link OidcProviderRegistry} publishes this instance as a {@code ConnectorService} under all those names.
 */
@Component(service = OidcConnector.class, immediate = true)
public class OidcConnector implements OAuthConnectorService {
    public static final String KEY = "OidcConnector";
    /**
     * The OAuth API every provider saved by the current UI points to through its {@code oauthApiName} property.
     */
    public static final String API_NAME = "OidcApi";
    public static final String DEFAULT_PROVIDER_ID = "default";
    public static final String PROPERTY_OAUTH_API_NAME = "oauthApiName";

    private static final String PKCE_BUILDER_ATTR = OidcConnector.class.getName() + ".authorizationUrlBuilder.";
    private static final Pattern PROVIDER_ID = Pattern.compile("[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?");
    private static final String NAMED_PREFIX = KEY + "-";

    private static final JahiaOAuthAPIBuilder API_BUILDER = config -> new OidcApi(
            config.getConnectorName(),
            config.getBooleanProperty("withPKCE"),
            config.getProperty("accessTokenEndpoint"),
            config.getProperty("authorizationBaseUrl"),
            config.getProperty("authentication"));

    @Reference
    private JahiaOAuthService jahiaOAuthService;
    @Reference
    private SettingsService settingsService;
    @Reference
    private JahiaSitesService jahiaSitesService;

    /**
     * API names that configurations written before multi-provider support still reference
     * ({@code OidcConnector-<siteKey>}).
     */
    private final Set<String> legacyApiNames = ConcurrentHashMap.newKeySet();

    @Activate
    private void onActivate() {
        jahiaOAuthService.addOAuthDefaultApi20(API_NAME, API_BUILDER);
        jahiaSitesService.getSitesNames().forEach(siteKey -> settingsService.getSettings(siteKey).getValues(null).getSubValueKeys().stream()
                .filter(OidcConnector::isOidcConnectorName)
                .map(connectorName -> settingsService.getConnectorConfig(siteKey, connectorName))
                .filter(Objects::nonNull)
                .forEach(this::validateSettings));
    }

    @Deactivate
    private void onDeactivate() {
        jahiaOAuthService.removeOAuthDefaultApi20(API_NAME);
        legacyApiNames.forEach(jahiaOAuthService::removeOAuthDefaultApi20);
        legacyApiNames.clear();
    }

    @Override
    public void validateSettings(ConnectorConfig connectorConfig) {
        // The builder reads the configuration on every call, so only a legacy API name needs registering.
        // jahia-oauth falls back to the connector name when oauthApiName is absent.
        String apiName = StringUtils.defaultIfBlank(connectorConfig.getProperty(PROPERTY_OAUTH_API_NAME), connectorConfig.getConnectorName());
        if (!API_NAME.equals(apiName) && legacyApiNames.add(apiName)) {
            jahiaOAuthService.addOAuthDefaultApi20(apiName, API_BUILDER);
        }
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

    public void setAuthorizationUrlBuilder(String connectorName, AuthorizationUrlBuilder authorizationUrlBuilder) {
        RequestContextHolder.getRequestAttributes().setAttribute(PKCE_BUILDER_ATTR + connectorName, authorizationUrlBuilder, RequestAttributes.SCOPE_SESSION);
    }

    public AuthorizationUrlBuilder getAuthorizationUrlBuilder(String connectorName) {
        return (AuthorizationUrlBuilder) RequestContextHolder.getRequestAttributes().getAttribute(PKCE_BUILDER_ATTR + connectorName, RequestAttributes.SCOPE_SESSION);
    }

    /**
     * @return true for {@code default} and for an id of 1 to 32 lowercase letters, digits and inner hyphens
     */
    public static boolean isValidProviderId(String providerId) {
        return providerId != null && (DEFAULT_PROVIDER_ID.equals(providerId) || PROVIDER_ID.matcher(providerId).matches());
    }

    public static String toConnectorName(String providerId) {
        if (!isValidProviderId(providerId)) {
            throw new IllegalArgumentException("Invalid OIDC provider id");
        }
        return DEFAULT_PROVIDER_ID.equals(providerId) ? KEY : NAMED_PREFIX + providerId;
    }

    public static String toProviderId(String connectorName) {
        return KEY.equals(connectorName) ? DEFAULT_PROVIDER_ID : StringUtils.removeStart(connectorName, NAMED_PREFIX);
    }

    public static boolean isOidcConnectorName(String connectorName) {
        if (KEY.equals(connectorName)) {
            return true;
        }
        if (!StringUtils.startsWith(connectorName, NAMED_PREFIX)) {
            return false;
        }
        String providerId = connectorName.substring(NAMED_PREFIX.length());
        return !DEFAULT_PROVIDER_ID.equals(providerId) && PROVIDER_ID.matcher(providerId).matches();
    }
}
