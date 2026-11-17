package org.jahiacommunity.modules.oauth.oidc;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.jahia.api.Constants;
import org.jahia.exceptions.JahiaException;
import org.jahia.params.valves.LoginUrlProvider;
import org.jahia.services.render.URLResolver;
import org.jahia.services.sites.JahiaSite;
import org.jahia.services.sites.JahiaSitesService;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.RequestDispatcher;
import javax.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sends a visitor who needs to log in, on a 401 of a live page or file, to the OIDC login page of the site, when the
 * site enabled it. Jahia's ErrorServlet asks the login URL providers on every 401, and appends
 * {@code redirect=<page>} for a rendered page; a file comes without it, so this provider adds it.
 * Anything else (edit mode, administration, a site that did not enable the page) keeps the Jahia login.
 */
@Component(service = LoginUrlProvider.class)
public class OidcLoginUrlProvider implements LoginUrlProvider {
    private static final Logger logger = LoggerFactory.getLogger(OidcLoginUrlProvider.class);
    /**
     * RequestDispatcher.ERROR_QUERY_STRING, which Servlet 3.1 does not declare.
     */
    private static final String ERROR_QUERY_STRING = "javax.servlet.error.query_string";
    private static final Pattern LIVE_FILE = Pattern.compile("^/files/" + Constants.LIVE_WORKSPACE + "/sites/([^/]+)/.*");

    @Reference
    private OidcProviderRegistry oidcProviderRegistry;
    @Reference
    private JahiaSitesService jahiaSitesService;

    @Override
    public boolean hasCustomLoginUrl() {
        return true;
    }

    @Override
    public String getLoginUrl(HttpServletRequest request) {
        String contextPath = StringUtils.defaultString(request.getContextPath());
        URLResolver urlResolver = (URLResolver) request.getAttribute("urlResolver");
        Target target = urlResolver != null ? livePage(urlResolver) : liveFile(request, contextPath);
        if (target == null || StringUtils.isBlank(target.siteKey) || !oidcProviderRegistry.isLoginPageEnabled(target.siteKey)
                || oidcProviderRegistry.getProviders(target.siteKey, true).isEmpty()) {
            return null;
        }
        String language = target.language != null ? target.language : defaultLanguage(target.siteKey);
        if (language == null) {
            return null;
        }
        String loginUrl = contextPath + "/cms/render/live/" + language + "/sites/" + target.siteKey + ".oidc-login.html";
        return target.redirect == null ? loginUrl
                : loginUrl + "?" + OidcRedirects.PARAMETER + "=" + URLEncoder.encode(target.redirect, StandardCharsets.UTF_8);
    }

    /**
     * @return the site and language of a page rendered from LIVE; the page itself is where the login returns by default
     */
    private static Target livePage(URLResolver urlResolver) {
        if (!"render".equals(urlResolver.getServletPart()) || !Constants.LIVE_WORKSPACE.equals(urlResolver.getWorkspace())) {
            return null;
        }
        return new Target(urlResolver.getSiteKey(), urlResolver.getLocale() == null ? null : urlResolver.getLocale().toString(), null);
    }

    /**
     * @return the site of a LIVE file, which has no language, and the file to return to once logged in
     */
    private static Target liveFile(HttpServletRequest request, String contextPath) {
        String uri = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        String path = Strings.CS.removeStart(uri, contextPath);
        Matcher matcher = path == null ? null : LIVE_FILE.matcher(path);
        if (matcher == null || !matcher.matches()) {
            return null;
        }
        String query = (String) request.getAttribute(ERROR_QUERY_STRING);
        return new Target(matcher.group(1), null, uri + (StringUtils.isEmpty(query) ? "" : "?" + query));
    }

    /**
     * The site of the resource a guest asked for, its language when the URL carries one, and where to return.
     */
    private static final class Target {
        private final String siteKey;
        private final String language;
        private final String redirect;

        private Target(String siteKey, String language, String redirect) {
            this.siteKey = siteKey;
            this.language = language;
            this.redirect = redirect;
        }
    }

    private String defaultLanguage(String siteKey) {
        try {
            JahiaSite site = jahiaSitesService.getSiteByKey(siteKey);
            return site == null ? null : site.getDefaultLanguage();
        } catch (JahiaException e) {
            logger.debug("Cannot read the site {}", siteKey, e);
            return null;
        }
    }
}
