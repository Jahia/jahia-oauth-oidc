package org.jahiacommunity.modules.oauth.oidc;

import org.apache.commons.lang3.StringUtils;

import javax.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * The page a visitor returns to after logging in, as the login page passes it on: only a page of the same server,
 * so that the login cannot redirect to another site.
 */
public final class OidcRedirects {
    public static final String PARAMETER = "redirect";
    private static final int MAX_LENGTH = 2048;

    private OidcRedirects() {
    }

    /**
     * @return the redirect as a path of this server, with its query, or null when it leads elsewhere or is malformed
     */
    public static String toLocalPath(HttpServletRequest request, String redirect) {
        String value = StringUtils.trimToNull(redirect);
        if (value == null || value.length() > MAX_LENGTH || StringUtils.containsAny(value, '\r', '\n', '\\')) {
            return null;
        }
        try {
            URI uri = new URI(value);
            if (uri.getScheme() == null && uri.getRawAuthority() == null) {
                return value.startsWith("/") ? value : null;
            }
            boolean sameServer = ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && request.getServerName().equalsIgnoreCase(uri.getHost())
                    && port(uri) == request.getServerPort();
            if (!sameServer || StringUtils.isEmpty(uri.getRawPath())) {
                return null;
            }
            return uri.getRawPath() + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
        } catch (URISyntaxException e) {
            return null;
        }
    }

    private static int port(URI uri) {
        if (uri.getPort() >= 0) {
            return uri.getPort();
        }
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }
}
