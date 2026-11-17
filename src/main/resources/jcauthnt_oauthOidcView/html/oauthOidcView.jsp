<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="oidc" uri="http://www.jahiacommunity.org/tags/oauth-oidc" %>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<%-- The card of the OIDC connector in the Jahia Authentication settings. The providers are managed in
     Administration > Sites > OpenID Connect; the card lists them and opens the mappers of each one. --%>
<template:addCacheDependency path="${oidc:cacheDependency(renderContext.site.siteKey)}"/>
<template:addResources type="javascript" resources="oidc-connector-controller.js"/>
<c:set var="providers" value="${oidc:allProviders(renderContext.site.siteKey)}"/>

<md-card ng-controller="OidcLinkCardController" data-test="oidc-link-card">
    <md-card-title>
        <md-card-title-text>
            <span class="md-headline"><fmt:message key="jcauthnt_oauthOidcView"/></span>
            <span class="md-subhead"><fmt:message key="oidcCard.intro"/></span>
        </md-card-title-text>
    </md-card-title>
    <md-card-content>
        <c:choose>
            <c:when test="${empty providers}">
                <p><fmt:message key="oidcCard.none"/></p>
            </c:when>
            <c:otherwise>
                <md-list>
                    <c:forEach items="${providers}" var="provider">
                        <md-list-item class="oidc-provider" data-provider="${fn:escapeXml(provider.id)}"
                                      data-connector="${fn:escapeXml(provider.connectorName)}"
                                      data-label="${fn:escapeXml(provider.label)}">
                            <p>${fn:escapeXml(provider.label)} (${fn:escapeXml(provider.id)}) &middot;
                                <fmt:message key="${provider.enabled ? 'oidcCard.enabled' : 'oidcCard.disabled'}"/></p>
                            <md-button class="md-accent" href="#/mappers/${fn:escapeXml(provider.connectorName)}">
                                <fmt:message key="oidcCard.mappers"/>
                            </md-button>
                        </md-list-item>
                    </c:forEach>
                </md-list>
            </c:otherwise>
        </c:choose>
    </md-card-content>
    <md-card-actions layout="row" layout-align="end center">
        <md-button class="md-raised md-accent" target="_top" data-test="oidc-manage-providers"
                   href="${url.context}/jahia/administration/${renderContext.site.siteKey}/jahia-oauth-oidc">
            <fmt:message key="oidcCard.manage"/>
        </md-button>
    </md-card-actions>
</md-card>
