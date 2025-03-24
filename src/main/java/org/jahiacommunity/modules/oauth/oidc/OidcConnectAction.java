package org.jahiacommunity.modules.oauth.oidc;

import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.bin.Render;
import org.jahia.modules.jahiaauth.service.SettingsService;
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
import java.util.List;
import java.util.Map;

@Component(service = Action.class)
public class OidcConnectAction extends Action {
    private static final Logger logger = LoggerFactory.getLogger(OidcConnectAction.class);

    @Reference
    private SettingsService settingsService;
    @Reference
    private JahiaOAuthService jahiaOAuthService;

    public OidcConnectAction() {
        setName("oidc-connect");
        setRequireAuthenticatedUser(false);
        setRequiredMethods(Render.METHOD_GET + "," + Render.METHOD_POST);
    }

    @Override
    public ActionResult doExecute(HttpServletRequest httpServletRequest, RenderContext renderContext, Resource resource, JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver) {
        return new ActionResult(HttpServletResponse.SC_OK,
                jahiaOAuthService.getAuthorizationUrl(
                        settingsService.getConnectorConfig(renderContext.getSite().getSiteKey(), OidcConnector.KEY),
                        httpServletRequest.getSession(false).getId()),
                true, null);
    }
}
