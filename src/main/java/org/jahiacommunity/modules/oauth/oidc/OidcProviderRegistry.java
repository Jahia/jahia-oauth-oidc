package org.jahiacommunity.modules.oauth.oidc;

import org.apache.commons.lang3.StringUtils;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.ConnectorService;
import org.jahia.modules.jahiaauth.service.JahiaAuthConstants;
import org.jahia.modules.jahiaauth.service.Settings;
import org.jahia.modules.jahiaauth.service.SettingsService;
import org.jahia.modules.jahiaoauth.service.OAuthConnectorService;
import org.jahia.services.render.filter.cache.ModuleCacheProvider;
import org.osgi.framework.BundleContext;
import org.osgi.framework.InvalidSyntaxException;
import org.osgi.framework.ServiceRegistration;
import org.osgi.service.cm.Configuration;
import org.osgi.service.cm.ConfigurationAdmin;
import org.osgi.service.cm.ConfigurationEvent;
import org.osgi.service.cm.ConfigurationListener;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Collections;
import java.util.Comparator;
import java.util.Dictionary;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * The OIDC providers of each site, and the OSGi registration that lets jahia-authentication and jahia-oauth find
 * them. Both modules look a connector up with the filter {@code (connectorServiceName=<name>)}, so the
 * {@link OidcConnector} is published once with a multi-valued {@code connectorServiceName} that lists every OIDC
 * connector name found in the {@code org.jahia.modules.auth} configurations.
 */
@Component(service = {OidcProviderRegistry.class, ConfigurationListener.class}, immediate = true)
public class OidcProviderRegistry implements ConfigurationListener {
    private static final Logger logger = LoggerFactory.getLogger(OidcProviderRegistry.class);
    private static final String AUTH_FACTORY_PID = "org.jahia.modules.auth";
    private static final String CACHE_DEPENDENCY_SUFFIX = "oidc-login-providers";
    private static final Comparator<OidcProvider> PROVIDER_ORDER = Comparator.comparingInt(OidcProvider::getOrder)
            .thenComparing(OidcProvider::getLabel, String.CASE_INSENSITIVE_ORDER);

    @Reference
    private ConfigurationAdmin configurationAdmin;
    @Reference
    private SettingsService settingsService;
    @Reference
    private OidcConnector oidcConnector;

    private BundleContext bundleContext;
    private ServiceRegistration<?> registration;
    private Set<String> registeredNames = Collections.emptySet();
    /**
     * Names created by this node whose configuration Config Admin has not reported yet.
     */
    private final Set<String> pendingNames = new HashSet<>();
    private final Map<String, String> siteKeysByPid = new ConcurrentHashMap<>();

    @Activate
    private void onActivate(BundleContext context) {
        this.bundleContext = context;
        refresh();
    }

    @Deactivate
    private synchronized void onDeactivate() {
        if (registration != null) {
            registration.unregister();
            registration = null;
        }
        registeredNames = Collections.emptySet();
        bundleContext = null;
    }

    @Override
    public void configurationEvent(ConfigurationEvent event) {
        if (!AUTH_FACTORY_PID.equals(event.getFactoryPid())) {
            return;
        }
        // A deleted configuration can no longer be read, so the site key comes from the previous refresh.
        String siteKey = siteKeysByPid.get(event.getPid());
        refresh();
        siteKey = siteKeysByPid.getOrDefault(event.getPid(), siteKey);
        if (siteKey != null) {
            // The login component lists the providers from this configuration, which no JCR event flushes.
            ModuleCacheProvider.getInstance().invalidate(cacheDependency(siteKey), true);
        }
    }

    /**
     * @return the cache dependency of the fragments that list the providers of the site
     */
    public static String cacheDependency(String siteKey) {
        return "/sites/" + siteKey + "/" + CACHE_DEPENDENCY_SUFFIX;
    }

    /**
     * Publishes the connector under every OIDC connector name of every site, plus {@link OidcConnector#KEY}.
     */
    public synchronized void refresh() {
        if (bundleContext == null) {
            return;
        }
        Set<String> names = new TreeSet<>();
        names.add(OidcConnector.KEY);
        Map<String, String> siteKeys = new HashMap<>();
        for (Configuration configuration : authConfigurations(null)) {
            Dictionary<String, Object> properties = configuration.getProperties();
            names.addAll(connectorNames(properties));
            if (properties != null && properties.get(JahiaAuthConstants.SITE_KEY) != null) {
                siteKeys.put(configuration.getPid(), properties.get(JahiaAuthConstants.SITE_KEY).toString());
            }
        }
        siteKeysByPid.keySet().retainAll(siteKeys.keySet());
        siteKeysByPid.putAll(siteKeys);
        pendingNames.removeAll(names);
        names.addAll(pendingNames);
        publish(names);
    }

    private void publish(Set<String> names) {
        if (registration != null && names.equals(registeredNames)) {
            return;
        }
        // The OSGi API takes a Dictionary, which Hashtable implements.
        @SuppressWarnings("java:S1149") Dictionary<String, Object> properties = new Hashtable<>();
        properties.put(JahiaAuthConstants.CONNECTOR_SERVICE_NAME, names.toArray(new String[0]));
        if (registration == null) {
            registration = bundleContext.registerService(
                    new String[]{OAuthConnectorService.class.getName(), ConnectorService.class.getName()}, oidcConnector, properties);
        } else {
            registration.setProperties(properties);
        }
        registeredNames = Collections.unmodifiableSet(names);
        logger.debug("OIDC connector published as {}", names);
    }

    /**
     * @param enabledOnly true to keep only the providers a visitor can log in with
     * @return the OIDC providers of the site, sorted by order, then by label
     */
    public List<OidcProvider> getProviders(String siteKey, boolean enabledOnly) {
        // Read from Config Admin, which holds a stored configuration at once: jahia-authentication reloads its
        // settings asynchronously, and the login component may render before it has.
        return authConfigurations(siteKey).stream().findFirst()
                .map(configuration -> getProviders(toMap(configuration.getProperties()), enabledOnly))
                .orElseGet(Collections::emptyList);
    }

    private static List<OidcProvider> getProviders(Map<String, String> properties, boolean enabledOnly) {
        Map<String, Map<String, String>> valuesByConnector = new HashMap<>();
        properties.forEach((key, value) -> {
            int dot = key.indexOf('.');
            if (dot > 0 && OidcConnector.isOidcConnectorName(key.substring(0, dot))) {
                valuesByConnector.computeIfAbsent(key.substring(0, dot), name -> new HashMap<>()).put(key.substring(dot + 1), value);
            }
        });
        return valuesByConnector.entrySet().stream()
                .map(entry -> new OidcProvider(entry.getKey(), entry.getValue()))
                .filter(provider -> !enabledOnly || provider.isEnabled())
                .sorted(PROVIDER_ORDER)
                .collect(Collectors.toList());
    }

    private static Map<String, String> toMap(Dictionary<String, Object> properties) {
        Map<String, String> map = new HashMap<>();
        if (properties != null) {
            Collections.list(properties.keys()).forEach(key -> map.put(key, String.valueOf(properties.get(key))));
        }
        return map;
    }

    /**
     * Resolves the connector a login starts with.
     *
     * @param providerId the requested provider, or blank to let the site decide: its {@code default} provider when
     *                   configured, which keeps the behaviour of single-provider sites, otherwise its only enabled
     *                   provider
     * @return the configuration, or empty when the provider is unknown, disabled or ambiguous
     */
    public Optional<ConnectorConfig> resolveForLogin(String siteKey, String providerId) {
        if (StringUtils.isBlank(providerId)) {
            ConnectorConfig legacy = settingsService.getConnectorConfig(siteKey, OidcConnector.KEY);
            if (legacy != null) {
                return Optional.of(legacy);
            }
            List<OidcProvider> enabled = getProviders(siteKey, true);
            return enabled.size() == 1
                    ? Optional.ofNullable(settingsService.getConnectorConfig(siteKey, enabled.get(0).getConnectorName()))
                    : Optional.empty();
        }
        if (!OidcConnector.isValidProviderId(providerId)) {
            return Optional.empty();
        }
        return Optional.ofNullable(settingsService.getConnectorConfig(siteKey, OidcConnector.toConnectorName(providerId)))
                .filter(config -> Boolean.TRUE.equals(config.getBooleanProperty(JahiaAuthConstants.PROPERTY_IS_ENABLED)));
    }

    /**
     * @return the settings of the provider, without the {@code <connectorName>.} prefix, or empty when the site has
     * no such provider
     */
    public Optional<Map<String, String>> getProviderSettings(String siteKey, String providerId) {
        String prefix = OidcConnector.toConnectorName(providerId) + ".";
        return authConfigurations(siteKey).stream().findFirst()
                .map(configuration -> toMap(configuration.getProperties()))
                .map(properties -> properties.entrySet().stream()
                        .filter(entry -> entry.getKey().startsWith(prefix))
                        .collect(Collectors.toMap(entry -> entry.getKey().substring(prefix.length()), Map.Entry::getValue)))
                .filter(values -> !values.isEmpty());
    }

    /**
     * Creates a disabled provider, ready to be configured from the site settings.
     */
    public void createProvider(String siteKey, String providerId, String label) throws IOException {
        String connectorName = OidcConnector.toConnectorName(providerId);
        if (getProviderSettings(siteKey, providerId).isPresent()) {
            throw new IllegalArgumentException("The OIDC provider " + providerId + " already exists");
        }
        Map<String, String> values = new HashMap<>();
        values.put(JahiaAuthConstants.PROPERTY_IS_ENABLED, Boolean.FALSE.toString());
        values.put(OidcConnector.PROPERTY_OAUTH_API_NAME, OidcConnector.API_NAME);
        values.put(OidcProvider.PROPERTY_LABEL, StringUtils.defaultIfBlank(StringUtils.trim(label), providerId));
        // jahia-authentication looks the connector up by name as soon as the configuration is stored.
        synchronized (this) {
            pendingNames.add(connectorName);
            Set<String> names = new TreeSet<>(registeredNames);
            names.add(connectorName);
            if (bundleContext != null) {
                publish(names);
            }
        }
        Optional<Configuration> configuration = authConfigurations(siteKey).stream().findFirst();
        if (configuration.isPresent()) {
            write(configuration.get(), connectorName, values, Collections.emptySet());
        } else {
            // jahia-authentication creates the configuration of a site, and the file that holds it.
            Settings settings = settingsService.getSettings(siteKey);
            Settings.Values settingsValues = settings.getValues(connectorName);
            values.forEach(settingsValues::setProperty);
            settingsService.storeSettings(settings);
        }
    }

    /**
     * Replaces the settings of an existing provider. Its mappers are kept.
     *
     * @param values  the settings to write, without the {@code <connectorName>.} prefix
     * @param removed the settings to remove
     */
    public void saveProvider(String siteKey, String providerId, Map<String, String> values, Set<String> removed) throws IOException {
        String connectorName = OidcConnector.toConnectorName(providerId);
        IllegalArgumentException unknown = new IllegalArgumentException("The OIDC provider " + providerId + " does not exist");
        Configuration configuration = authConfigurations(siteKey).stream().findFirst().orElseThrow(() -> unknown);
        if (getProviderSettings(siteKey, providerId).isEmpty()) {
            throw unknown;
        }
        write(configuration, connectorName, values, removed);
    }

    /**
     * Writes through Config Admin, never through {@code SettingsService.storeSettings()}: that call merges the
     * settings jahia-authentication holds in memory, which it reloads asynchronously, into the configuration, and
     * could write back a provider just deleted.
     */
    private static void write(Configuration configuration, String connectorName, Map<String, String> values, Set<String> removed) throws IOException {
        Dictionary<String, Object> properties = configuration.getProperties();
        removed.forEach(name -> properties.remove(connectorName + "." + name));
        values.forEach((name, value) -> properties.put(connectorName + "." + name, value));
        configuration.update(properties);
    }

    /**
     * Removes the provider, with its mappers, from the configuration of the site.
     */
    public void deleteProvider(String siteKey, String providerId) throws IOException {
        String connectorName = OidcConnector.toConnectorName(providerId);
        String prefix = connectorName + ".";
        IllegalArgumentException unknown = new IllegalArgumentException("The OIDC provider " + providerId + " does not exist");
        Configuration configuration = authConfigurations(siteKey).stream().findFirst().orElseThrow(() -> unknown);
        Dictionary<String, Object> properties = configuration.getProperties();
        List<String> keys = Collections.list(properties.keys()).stream().filter(key -> key.startsWith(prefix)).collect(Collectors.toList());
        if (keys.isEmpty()) {
            throw unknown;
        }
        synchronized (this) {
            pendingNames.remove(connectorName);
        }
        keys.forEach(properties::remove);
        // Config Admin notifies jahia-authentication, which reloads the settings of the site, and this registry,
        // asynchronously: drop the keys from the settings in memory too, so the next read already misses them.
        configuration.update(properties);
        settingsService.getSettings(siteKey).getProperties().keySet().removeIf(key -> key.startsWith(prefix));
    }

    private List<Configuration> authConfigurations(String siteKey) {
        String filter = "(service.factoryPid=" + AUTH_FACTORY_PID + ")";
        if (siteKey != null) {
            filter = "(&" + filter + "(" + JahiaAuthConstants.SITE_KEY + "=" + escapeFilterValue(siteKey) + "))";
        }
        try {
            Configuration[] configurations = configurationAdmin.listConfigurations(filter);
            return configurations == null ? Collections.emptyList() : List.of(configurations);
        } catch (IOException | InvalidSyntaxException e) {
            logger.error("Cannot list the {} configurations", AUTH_FACTORY_PID, e);
            return Collections.emptyList();
        }
    }

    private static Set<String> connectorNames(Dictionary<String, Object> properties) {
        Set<String> names = new HashSet<>();
        if (properties == null) {
            return names;
        }
        Enumeration<String> keys = properties.keys();
        while (keys.hasMoreElements()) {
            String key = keys.nextElement();
            int dot = key.indexOf('.');
            if (dot > 0 && OidcConnector.isOidcConnectorName(key.substring(0, dot))) {
                names.add(key.substring(0, dot));
            }
        }
        return names;
    }

    private static String escapeFilterValue(String value) {
        StringBuilder escaped = new StringBuilder(value.length());
        for (char c : value.toCharArray()) {
            if (c == '\\' || c == '*' || c == '(' || c == ')') {
                escaped.append('\\');
            }
            escaped.append(c);
        }
        return escaped.toString();
    }
}
