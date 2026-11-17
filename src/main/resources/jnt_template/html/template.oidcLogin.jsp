<%@ page contentType="text/html;charset=UTF-8" %>
<!DOCTYPE html>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="oidc" uri="http://www.jahiacommunity.org/tags/oauth-oidc" %>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<%-- The login page of a site, /sites/<siteKey>.oidc-login.html, in the look of the Jahia login page
     (war/src/main/webapp/errors/error_401.jsp): it reuses the styles and images that Jahia serves. --%>
<template:addCacheDependency path="${oidc:cacheDependency(renderContext.site.siteKey)}"/>
<c:set var="contextPath" value="${pageContext.request.contextPath}"/>
<c:set var="providers" value="${oidc:loginProviders(renderContext.site.siteKey)}"/>
<c:set var="connectUrl" value="${url.base}${renderContext.site.path}.oidc-connect.do"/>
<html lang="${fn:escapeXml(renderContext.mainResourceLocale.language)}">
<head>
    <meta charset="UTF-8"/>
    <meta name="robots" content="noindex, nofollow"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title><fmt:message key="oidcLoginPage.title"/> - ${fn:escapeXml(renderContext.site.title)}</title>
    <link rel="shortcut icon" href="${contextPath}/favicon.ico"/>
    <link rel="stylesheet" href="${contextPath}/css/loginFont.css"/>
    <link rel="stylesheet" href="${contextPath}/css/loginMain_dark.css"/>
    <link rel="stylesheet" href="${contextPath}/modules/jahia-oauth-oidc/css/oidc-login.css"/>
</head>
<body>
<section class="login" style="background-image: url(${contextPath}/css/images/login-background.jpg);">
    <div class="login-main">
        <div class="position-container">
            <div class="logo-form-container">
                <div class="logo">
                    <img src="${contextPath}/css/images/dx_logo.png" alt="Jahia"/>
                </div>
                <div class="login-form oidc-login-page" data-test="oidc-login-providers">
                    <h1 class="oidc-login-page__title">${fn:escapeXml(renderContext.site.title)}</h1>
                    <c:choose>
                        <c:when test="${empty providers}">
                            <p class="oidc-login-page__empty"><fmt:message key="oidcLoginProviders.none"/></p>
                        </c:when>
                        <c:otherwise>
                            <c:forEach items="${providers}" var="provider">
                                <form method="get" action="${fn:escapeXml(connectUrl)}">
                                    <input type="hidden" name="provider" value="${fn:escapeXml(provider.id)}"/>
                                    <button type="submit" class="oidc-login__provider" data-provider="${fn:escapeXml(provider.id)}">
                                        <c:if test="${not empty provider.logoUrl}">
                                            <img src="${fn:escapeXml(provider.logoUrl)}" alt="" height="16"/>
                                        </c:if>
                                        <fmt:message key="oidcLoginProviders.signInWith">
                                            <fmt:param value="${fn:escapeXml(provider.label)}"/>
                                        </fmt:message>
                                    </button>
                                </form>
                            </c:forEach>
                        </c:otherwise>
                    </c:choose>
                    <a class="oidc-login-page__jahia" href="${contextPath}/cms/login"><fmt:message key="oidcLoginPage.jahiaAccount"/></a>
                </div>
            </div>
        </div>
    </div>
</section>
</body>
</html>
