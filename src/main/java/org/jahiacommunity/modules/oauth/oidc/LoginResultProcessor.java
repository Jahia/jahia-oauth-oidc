package org.jahiacommunity.modules.oauth.oidc;

import com.github.scribejava.core.oauth.AuthorizationUrlBuilder;
import org.jahia.api.usermanager.JahiaUserManagerService;
import org.jahia.modules.jahiaauth.service.ConnectorConfig;
import org.jahia.modules.jahiaauth.service.ConnectorResultProcessor;
import org.jahia.modules.jahiaauth.service.JahiaAuthConstants;
import org.jahia.modules.jahiaauth.service.JahiaAuthMapperService;
import org.jahia.modules.jahiaauth.service.MappedProperty;
import org.jahia.modules.jahiaauth.service.MappedPropertyInfo;
import org.jahia.modules.jahiaoauth.service.JahiaOAuthConstants;
import org.json.JSONException;
import org.json.JSONObject;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.context.request.RequestContextHolder;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Component(service = {ConnectorResultProcessor.class, LoginResultProcessor.class}, immediate = true)
public class LoginResultProcessor implements ConnectorResultProcessor {
    private static final Logger logger = LoggerFactory.getLogger(LoginResultProcessor.class);

    private final Map<String, AuthorizationUrlBuilder> authorizationUrlBuilders;

    public LoginResultProcessor() {
        authorizationUrlBuilders = new HashMap<>();
    }

    @Reference
    private JahiaAuthMapperService jahiaAuthMapperService;
    @Reference
    private JahiaUserManagerService jahiaUserManagerService;

    @Override
    public void execute(ConnectorConfig connectorConfig, Map<String, Object> results) {
        try {
            JSONObject tokenData = getTokenData(results);
            if (tokenData == null) {
                if (logger.isDebugEnabled()) {
                    logger.debug("Error parsing OpenID Token: {}", results);
                }
            } else if (userDoesntExist(tokenData, connectorConfig.getProperty("userAttribute"))) {
                logger.warn("Unable to log in user: {}", results);
            }
        } catch (JSONException e) {
            logger.error("Error parsing OpenID Token");
            if (logger.isDebugEnabled()) {
                logger.debug("", e);
            }
        }
        authorizationUrlBuilders.remove(RequestContextHolder.getRequestAttributes().getSessionId());
    }

    private JSONObject getTokenData(Map<String, Object> results) throws JSONException {
        Map<String, String> tokenData = (Map<String, String>) results.get(JahiaOAuthConstants.TOKEN_DATA);
        if (tokenData.containsKey(JahiaOAuthConstants.OPEN_ID_TOKEN)) {
            String token = tokenData.get(JahiaOAuthConstants.OPEN_ID_TOKEN);
            if (token != null) {
                String[] chunks = token.split("\\.");
                return new JSONObject(new String(Base64.getUrlDecoder().decode(chunks[1]), StandardCharsets.UTF_8));
            }
        }
        return null;
    }

    private boolean userDoesntExist(JSONObject tokenData, String userKey) throws JSONException {
        if (tokenData.has(userKey)) {
            String userId = tokenData.getString(userKey);
            if (jahiaUserManagerService.userExists(userId)) {
                logger.debug("User {} exists", userId);
                // store login to cache
                jahiaAuthMapperService.cacheMapperResults(OidcConnector.KEY, RequestContextHolder.getRequestAttributes().getSessionId(),
                        Collections.singletonMap(JahiaAuthConstants.SSO_LOGIN, new MappedProperty(
                                new MappedPropertyInfo(JahiaAuthConstants.SSO_LOGIN), userId)));
                return false;
            }
        }
        return true;
    }

    public void setAuthorizationUrlBuilder(AuthorizationUrlBuilder authorizationUrlBuilder) {
        authorizationUrlBuilders.put(RequestContextHolder.getRequestAttributes().getSessionId(), authorizationUrlBuilder);
    }

    public AuthorizationUrlBuilder getAuthorizationUrlBuilder() {
        return authorizationUrlBuilders.get(RequestContextHolder.getRequestAttributes().getSessionId());
    }
}
