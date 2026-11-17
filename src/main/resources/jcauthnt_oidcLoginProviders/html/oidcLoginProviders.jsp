<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="oidc" uri="http://www.jahiacommunity.org/tags/oauth-oidc" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<%-- The provider list comes from the OSGi configuration of the site, which no JCR event flushes:
     OidcProviderRegistry invalidates this dependency when that configuration changes. --%>
<template:addCacheDependency path="${oidc:cacheDependency(renderContext.site.siteKey)}"/>
<template:addResources type="css" resources="oidc-login.css"/>
<c:set var="providers" value="${oidc:loginProviders(renderContext.site.siteKey)}"/>
<c:set var="connectUrl" value="${url.base}${renderContext.mainResource.node.path}.oidc-connect.do"/>
<c:set var="interactive" value="${renderContext.liveMode or renderContext.previewMode}"/>

<div class="oidc-login" data-test="oidc-login-providers">
    <c:if test="${currentNode.displayableName ne currentNode.name}">
        <h2 class="oidc-login__title">${fn:escapeXml(currentNode.displayableName)}</h2>
    </c:if>

    <c:choose>
        <c:when test="${empty providers}">
            <p class="oidc-login__empty"><fmt:message key="oidcLoginProviders.none"/></p>
        </c:when>
        <c:otherwise>
            <ul class="oidc-login__providers">
                <c:forEach items="${providers}" var="provider">
                    <c:url var="providerUrl" value="${connectUrl}">
                        <c:param name="provider" value="${provider.id}"/>
                    </c:url>
                    <li>
                        <a class="oidc-login__provider" data-provider="${fn:escapeXml(provider.id)}"
                           href="${interactive ? fn:escapeXml(providerUrl) : '#'}">
                            <c:if test="${not empty provider.logoUrl}">
                                <img src="${fn:escapeXml(provider.logoUrl)}" alt="" height="24"/>
                            </c:if>
                            <span>
                                <fmt:message key="oidcLoginProviders.signInWith">
                                    <fmt:param value="${fn:escapeXml(provider.label)}"/>
                                </fmt:message>
                            </span>
                        </a>
                    </li>
                </c:forEach>
            </ul>

            <c:if test="${renderContext.liveMode and currentNode.properties.autoRedirect.boolean and fn:length(providers) == 1}">
                <%-- Redirects once per tab, so a login that comes back to this page does not loop. --%>
                <script>
                    (function () {
                        var key = 'oidcAutoRedirect';
                        try {
                            if (window.sessionStorage.getItem(key)) {
                                return;
                            }
                            window.sessionStorage.setItem(key, '1');
                        } catch (e) {
                            return;
                        }
                        window.location.replace(document.querySelector('.oidc-login__provider').href);
                    })();
                </script>
            </c:if>
        </c:otherwise>
    </c:choose>
</div>
