package org.jahiacommunity.modules.oauth.oidc;

import org.apache.commons.lang.StringUtils;
import org.jahia.api.content.JCRTemplate;
import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.bin.Render;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.SettingsService;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthConstants;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthService;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLResolver;
import org.jahia.services.sites.JahiaSitesService;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component(service = Action.class)
public class OidcCallbackAction extends Action {
    private static final Logger logger = LoggerFactory.getLogger(OidcCallbackAction.class);

    @Reference
    private SettingsService settingsService;
    @Reference
    private JahiaOAuthService jahiaOAuthService;
    @Reference
    private JCRTemplate jcrTemplate;
    @Reference
    private JahiaSitesService jahiaSitesService;

    public OidcCallbackAction() {
        setName("oidc-callback");
        setRequireAuthenticatedUser(false);
        setRequiredMethods(Render.METHOD_GET);
    }

    @Override
    public ActionResult doExecute(HttpServletRequest httpServletRequest, RenderContext renderContext, Resource resource, JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver) {
        HttpSession httpSession = httpServletRequest.getSession(false);
        String sessionId = httpSession == null ? null : httpSession.getId();
        if (parameters.containsKey(JahiaOAuthConstants.STATE)) {
            String state = getRequiredParameter(parameters, JahiaOAuthConstants.STATE);
            if (!state.equals(sessionId)) {
                logger.error("Invalid {} parameter {}, different as sessionId {}", JahiaOAuthConstants.STATE, state, sessionId);
                return ActionResult.BAD_REQUEST;
            }
        }
        if (!parameters.containsKey("code")) {
            logger.error("Could not authenticate user with SSO, the callback from the server was missing mandatory parameters");
            return ActionResult.BAD_REQUEST;
        }
        String token = getRequiredParameter(parameters, "code");
        if (StringUtils.isBlank(token)) {
            logger.error("Token is blank");
            return ActionResult.BAD_REQUEST;
        }

        try {
            String siteKey = renderContext.getSite().getSiteKey();
            ConnectorConfig connectorConfig = settingsService.getConnectorConfig(siteKey, connectorName(httpSession));
            if (connectorConfig == null) {
                logger.error("No OIDC provider configuration for the login in progress on site {}", siteKey);
                return ActionResult.BAD_REQUEST;
            }
            jahiaOAuthService.extractAccessTokenAndExecuteMappers(connectorConfig, token, sessionId);
            // The page the visitor asked for, when the login started from it, wins over the return mode.
            String returnUrl = httpSession == null ? null : (String) httpSession.getAttribute(OidcConnectAction.REDIRECT_SESSION_ATTRIBUTE);
            if (httpSession != null) {
                httpSession.removeAttribute(OidcConnectAction.REDIRECT_SESSION_ATTRIBUTE);
            }
            if (StringUtils.isBlank(returnUrl)) {
                returnUrl = returnUrl(connectorConfig, httpServletRequest);
            }
            if (StringUtils.isBlank(returnUrl)) {
                // by default redirect to site homepage
                returnUrl = jcrTemplate.doExecuteWithSystemSessionAsUser(null, renderContext.getWorkspace(), renderContext.getMainResourceLocale(), systemSession ->
                        jahiaSitesService.getSiteByKey(siteKey, systemSession).getHome().getUrl());
            }
            // site query param is mandatory for the SSOValve in jahia-authentication module
            return new ActionResult(HttpServletResponse.SC_OK, returnUrl + (StringUtils.contains(returnUrl, "?") ? "&" : "?") + "site=" + siteKey, true, null);
        } catch (Exception e) {
            logger.error("", e);
        }
        return ActionResult.BAD_REQUEST;
    }

    /**
     * @return the URL the return mode of the provider names, or null for the site homepage
     */
    private static String returnUrl(ConnectorConfig connectorConfig, HttpServletRequest httpServletRequest) {
        String returnMode = connectorConfig.getProperty("returnMode");
        if ("url".equals(returnMode)) {
            return connectorConfig.getProperty("returnUrl");
        }
        if (!"cookie".equals(returnMode)) {
            return null;
        }
        String cookieName = connectorConfig.getProperty("returnCookie");
        if (StringUtils.isBlank(cookieName)) {
            return null;
        }
        String cookieRedirect = Optional.ofNullable(httpServletRequest.getCookies()).flatMap(cookies -> Arrays.stream(cookies)
                .filter(cookie -> cookie.getName().equals(cookieName))
                .map(Cookie::getValue)
                .findFirst()).orElse(null);
        if (!StringUtils.startsWithIgnoreCase(cookieRedirect, "/")) {
            logger.error("Invalid cookie {}={}", cookieName, cookieRedirect);
            return null;
        }
        return cookieRedirect;
    }

    /**
     * @return the connector the login started with, or the single-provider connector when the session holds none
     */
    private static String connectorName(HttpSession httpSession) {
        Object connectorName = httpSession == null ? null : httpSession.getAttribute(OidcConnectAction.CONNECTOR_SESSION_ATTRIBUTE);
        if (connectorName instanceof String && OidcConnector.isOidcConnectorName((String) connectorName)) {
            return (String) connectorName;
        }
        return OidcConnector.KEY;
    }
}
