package org.jahiacommunity.modules.oauth.oidc.graphql;

import graphql.ErrorType;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.jahia.modules.graphql.provider.dxm.BaseGqlClientException;
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;
import org.jahia.osgi.BundleUtils;
import org.jahia.services.content.JCRSessionFactory;
import org.jahiacommunity.modules.oauth.oidc.OidcConnector;
import org.jahiacommunity.modules.oauth.oidc.OidcProviderRegistry;

import javax.jcr.PathNotFoundException;
import javax.jcr.RepositoryException;
import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * What the GraphQL fields share: the permission check, the validation of the settings and their names in the
 * configuration of jahia-authentication.
 */
final class OidcGraphQLSupport {
    static final String REQUIRED_PERMISSION = "canSetupJahiaAuth";

    static final String ENABLED = "enabled";
    static final String LABEL = "label";
    static final String LOGO_URL = "logoUrl";
    static final String ORDER = "order";
    static final String CLIENT_ID = "apiKey";
    static final String CLIENT_SECRET = "apiSecret";
    static final String SCOPE = "scope";
    static final String AUTHENTICATION = "authentication";
    static final String WITH_PKCE = "withPKCE";
    static final String ACCESS_TOKEN_ENDPOINT = "accessTokenEndpoint";
    static final String AUTHORIZATION_BASE_URL = "authorizationBaseUrl";
    static final String CALLBACK_URL = "callbackUrl";
    static final String PROFILE_URL = "profileUrl";
    static final String RETURN_MODE = "returnMode";
    static final String RETURN_URL = "returnUrl";
    static final String RETURN_COOKIE = "returnCookie";
    /**
     * What the 2.x UI stored for a public client, which has no secret.
     */
    static final String UNUSED_SECRET = "DEFAULT_SECRET_UNUSED";

    private static final Pattern SITE_KEY = Pattern.compile("[\\w-]+");
    private static final Set<String> AUTHENTICATIONS = Set.of("basic", "body");
    private static final Set<String> RETURN_MODES = Set.of("homepage", "url", "cookie");

    private OidcGraphQLSupport() {
    }

    static OidcProviderRegistry registry() {
        return Objects.requireNonNull(BundleUtils.getOsgiService(OidcProviderRegistry.class, null), "OidcProviderRegistry is not available");
    }

    /**
     * Refuses a user who cannot set up jahia-authentication on the site. An unknown site and a site the user cannot
     * read are refused alike.
     */
    static void checkCanSetup(String siteKey) {
        boolean allowed = false;
        if (siteKey != null && SITE_KEY.matcher(siteKey).matches()) {
            try {
                allowed = JCRSessionFactory.getInstance().getCurrentUserSession().getNode("/sites/" + siteKey).hasPermission(REQUIRED_PERMISSION);
            } catch (PathNotFoundException e) {
                allowed = false;
            } catch (RepositoryException e) {
                throw new DataFetchingException(e);
            }
        }
        if (!allowed) {
            throw new BaseGqlClientException("Permission denied: " + REQUIRED_PERMISSION + " is required on the site", ErrorType.ValidationError);
        }
    }

    static boolean isValidProviderId(String providerId) {
        return OidcConnector.isValidProviderId(providerId);
    }

    static void requireValidProviderId(String providerId) {
        if (!isValidProviderId(providerId)) {
            throw new BaseGqlClientException("The provider id must be 1 to 32 lowercase letters, digits or inner hyphens", ErrorType.ValidationError);
        }
    }

    /**
     * @return the provider, or null when the site has none with this id
     */
    static GqlOidcProvider provider(String siteKey, String providerId) {
        return registry().getProviderSettings(siteKey, providerId)
                .map(values -> new GqlOidcProvider(OidcConnector.toConnectorName(providerId), values))
                .orElse(null);
    }

    interface IOAction {
        void run() throws IOException;
    }

    /**
     * Runs a change of the configuration: an invalid request becomes a validation error.
     */
    static void run(IOAction action) {
        try {
            action.run();
        } catch (IllegalArgumentException e) {
            throw new BaseGqlClientException(e.getMessage(), ErrorType.ValidationError);
        } catch (IOException e) {
            throw new DataFetchingException(e);
        }
    }

    static void save(String siteKey, String providerId, GqlOidcProviderInput input) {
        Map<String, String> stored = registry().getProviderSettings(siteKey, providerId)
                .orElseThrow(() -> new BaseGqlClientException("The OIDC provider " + providerId + " does not exist", ErrorType.ValidationError));
        Map<String, String> values = new HashMap<>();
        Set<String> removed = new HashSet<>();

        values.put(ENABLED, Boolean.toString(Boolean.TRUE.equals(input.getEnabled())));
        values.put(LABEL, StringUtils.defaultIfBlank(StringUtils.trim(input.getLabel()), providerId));
        optional(values, removed, LOGO_URL, checkLogoUrl(input.getLogoUrl()));
        values.put(ORDER, Integer.toString(input.getOrder() == null ? 0 : input.getOrder()));
        values.put(CLIENT_ID, required(input.getClientId(), "The client ID"));
        String secret = StringUtils.trimToNull(input.getClientSecret());
        if (secret != null) {
            values.put(CLIENT_SECRET, secret);
        } else if (StringUtils.isBlank(stored.get(CLIENT_SECRET))) {
            values.put(CLIENT_SECRET, UNUSED_SECRET);
        }
        optional(values, removed, SCOPE, StringUtils.trimToNull(input.getScope()));
        values.put(AUTHENTICATION, oneOf(StringUtils.defaultIfBlank(input.getAuthentication(), "basic"), AUTHENTICATIONS, "The authentication"));
        values.put(WITH_PKCE, Boolean.toString(Boolean.TRUE.equals(input.getWithPKCE())));
        values.put(ACCESS_TOKEN_ENDPOINT, httpUrl(required(input.getAccessTokenEndpoint(), "The access token endpoint URL"), "The access token endpoint URL"));
        values.put(AUTHORIZATION_BASE_URL, httpUrl(required(input.getAuthorizationBaseUrl(), "The authorization base URL"), "The authorization base URL"));
        String callbackUrl = httpUrl(required(input.getCallbackUrl(), "The callback URL"), "The callback URL");
        if (!callbackUrl.endsWith(".oidc-callback.do")) {
            throw invalid("The callback URL must end with .oidc-callback.do");
        }
        values.put(CALLBACK_URL, callbackUrl);
        String profileUrl = StringUtils.trimToNull(input.getProfileUrl());
        optional(values, removed, PROFILE_URL, profileUrl == null ? null : httpUrl(profileUrl, "The profile URL"));

        String returnMode = oneOf(StringUtils.defaultIfBlank(input.getReturnMode(), "homepage"), RETURN_MODES, "The return mode");
        values.put(RETURN_MODE, returnMode);
        optional(values, removed, RETURN_URL, "url".equals(returnMode) ? required(input.getReturnUrl(), "The return URL") : null);
        optional(values, removed, RETURN_COOKIE, "cookie".equals(returnMode) ? required(input.getReturnCookie(), "The cookie name") : null);

        if (StringUtils.isBlank(stored.get(OidcConnector.PROPERTY_OAUTH_API_NAME))) {
            values.put(OidcConnector.PROPERTY_OAUTH_API_NAME, OidcConnector.API_NAME);
        }
        run(() -> registry().saveProvider(siteKey, providerId, values, removed));
    }

    /**
     * Turns a provider on or off and leaves its other settings as they are. Turning it off always works; turning it
     * on needs the settings a login cannot do without.
     */
    static void setEnabled(String siteKey, String providerId, boolean enabled) {
        Map<String, String> stored = registry().getProviderSettings(siteKey, providerId)
                .orElseThrow(() -> new BaseGqlClientException("The OIDC provider " + providerId + " does not exist", ErrorType.ValidationError));
        if (enabled) {
            required(stored.get(CLIENT_ID), "The client ID");
            httpUrl(required(stored.get(ACCESS_TOKEN_ENDPOINT), "The access token endpoint URL"), "The access token endpoint URL");
            httpUrl(required(stored.get(AUTHORIZATION_BASE_URL), "The authorization base URL"), "The authorization base URL");
            httpUrl(required(stored.get(CALLBACK_URL), "The callback URL"), "The callback URL");
        }
        run(() -> registry().saveProvider(siteKey, providerId, Map.of(ENABLED, Boolean.toString(enabled)), Set.of()));
    }

    private static void optional(Map<String, String> values, Set<String> removed, String name, String value) {
        if (value == null) {
            removed.add(name);
        } else {
            values.put(name, value);
        }
    }

    private static String required(String value, String what) {
        String trimmed = StringUtils.trimToNull(value);
        if (trimmed == null) {
            throw invalid(what + " is mandatory");
        }
        return trimmed;
    }

    private static String httpUrl(String value, String what) {
        if (!Strings.CI.startsWithAny(value, "https://", "http://")) {
            throw invalid(what + " must be an absolute http(s) URL");
        }
        return value;
    }

    private static String checkLogoUrl(String value) {
        String url = StringUtils.trimToNull(value);
        if (url == null) {
            return null;
        }
        boolean serverRelative = url.startsWith("/") && !url.startsWith("//");
        if (!serverRelative && !Strings.CI.startsWithAny(url, "https://", "http://")) {
            throw invalid("The logo URL must be an absolute http(s) URL or a path that starts with /");
        }
        return url;
    }

    private static String oneOf(String value, Set<String> allowed, String what) {
        if (!allowed.contains(value)) {
            throw invalid(what + " must be one of " + allowed);
        }
        return value;
    }

    private static BaseGqlClientException invalid(String message) {
        return new BaseGqlClientException(message, ErrorType.ValidationError);
    }
}
