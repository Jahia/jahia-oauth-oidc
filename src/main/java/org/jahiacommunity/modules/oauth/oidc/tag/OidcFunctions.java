package org.jahiacommunity.modules.oauth.oidc.tag;

import org.jahia.osgi.BundleUtils;
import org.jahiacommunity.modules.oauth.oidc.OidcProvider;
import org.jahiacommunity.modules.oauth.oidc.OidcProviderRegistry;

import java.util.Collections;
import java.util.List;

/**
 * JSP functions of the {@code oidc} tag library.
 */
public final class OidcFunctions {
    private OidcFunctions() {
    }

    /**
     * @return the enabled OIDC providers of the site, in display order
     */
    public static List<OidcProvider> loginProviders(String siteKey) {
        OidcProviderRegistry registry = BundleUtils.getOsgiService(OidcProviderRegistry.class, null);
        return registry == null ? Collections.emptyList() : registry.getProviders(siteKey, true);
    }

    /**
     * @return every OIDC provider of the site, enabled or not, in display order
     */
    public static List<OidcProvider> allProviders(String siteKey) {
        OidcProviderRegistry registry = BundleUtils.getOsgiService(OidcProviderRegistry.class, null);
        return registry == null ? Collections.emptyList() : registry.getProviders(siteKey, false);
    }

    /**
     * @return the cache dependency that {@link OidcProviderRegistry} invalidates when the providers of the site change
     */
    public static String cacheDependency(String siteKey) {
        return OidcProviderRegistry.cacheDependency(siteKey);
    }
}
