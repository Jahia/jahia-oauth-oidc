package org.jahiacommunity.modules.oauth.oidc;

import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.bin.Render;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthService;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLResolver;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component(service = Action.class)
public class OidcConnectAction extends Action {
    private static final Logger logger = LoggerFactory.getLogger(OidcConnectAction.class);

    /**
     * The connector name of the login in progress, read back by {@link OidcCallbackAction}.
     */
    static final String CONNECTOR_SESSION_ATTRIBUTE = OidcConnectAction.class.getName() + ".connectorName";
    static final String PROVIDER_PARAMETER = "provider";
    /**
     * The page the visitor asked for before logging in, read back by {@link OidcCallbackAction}.
     */
    static final String REDIRECT_SESSION_ATTRIBUTE = OidcConnectAction.class.getName() + ".redirect";

    @Reference
    private OidcProviderRegistry oidcProviderRegistry;
    @Reference
    private JahiaOAuthService jahiaOAuthService;

    public OidcConnectAction() {
        setName("oidc-connect");
        setRequireAuthenticatedUser(false);
        setRequiredMethods(Render.METHOD_GET + "," + Render.METHOD_POST);
    }

    @Override
    public ActionResult doExecute(HttpServletRequest httpServletRequest, RenderContext renderContext, Resource resource, JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver) {
        String siteKey = renderContext.getSite().getSiteKey();
        String providerId = getParameter(parameters, PROVIDER_PARAMETER);
        Optional<ConnectorConfig> connectorConfig = oidcProviderRegistry.resolveForLogin(siteKey, providerId);
        if (connectorConfig.isEmpty()) {
            logger.error("No enabled OIDC provider matches the request on site {}", siteKey);
            return ActionResult.BAD_REQUEST;
        }
        HttpSession httpSession = httpServletRequest.getSession();
        httpSession.setAttribute(CONNECTOR_SESSION_ATTRIBUTE, connectorConfig.get().getConnectorName());
        String redirect = OidcRedirects.toLocalPath(httpServletRequest, getParameter(parameters, OidcRedirects.PARAMETER));
        if (redirect == null) {
            httpSession.removeAttribute(REDIRECT_SESSION_ATTRIBUTE);
        } else {
            httpSession.setAttribute(REDIRECT_SESSION_ATTRIBUTE, redirect);
        }
        return new ActionResult(HttpServletResponse.SC_OK, jahiaOAuthService.getAuthorizationUrl(connectorConfig.get(), httpSession.getId()), true, null);
    }
}
