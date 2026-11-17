package org.jahiacommunity.modules.oauth.oidc;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.apache.commons.lang3.math.NumberUtils;

import java.util.Map;

/**
 * An OIDC provider of a site, as the login page and the site settings list it.
 */
public final class OidcProvider {
    public static final String PROPERTY_LABEL = "label";
    public static final String PROPERTY_LOGO_URL = "logoUrl";
    public static final String PROPERTY_ORDER = "order";

    private final String id;
    private final String connectorName;
    private final String label;
    private final String logoUrl;
    private final int order;
    private final boolean enabled;

    /**
     * @param values the settings of the connector, without the {@code <connectorName>.} prefix
     */
    OidcProvider(String connectorName, Map<String, String> values) {
        this.connectorName = connectorName;
        this.id = OidcConnector.toProviderId(connectorName);
        this.label = StringUtils.defaultIfBlank(values.get(PROPERTY_LABEL), id);
        this.logoUrl = safeLogoUrl(values.get(PROPERTY_LOGO_URL));
        this.order = NumberUtils.toInt(values.get(PROPERTY_ORDER), 0);
        this.enabled = Boolean.parseBoolean(values.get("enabled"));
    }

    /**
     * Keeps an absolute http(s) URL or a server-relative path, and drops any other scheme.
     */
    private static String safeLogoUrl(String value) {
        String url = StringUtils.trimToNull(value);
        if (url == null) {
            return null;
        }
        boolean serverRelative = url.startsWith("/") && !url.startsWith("//");
        return serverRelative || Strings.CI.startsWithAny(url, "https://", "http://") ? url : null;
    }

    public String getId() {
        return id;
    }

    public String getConnectorName() {
        return connectorName;
    }

    public String getLabel() {
        return label;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public int getOrder() {
        return order;
    }

    public boolean isEnabled() {
        return enabled;
    }
}
