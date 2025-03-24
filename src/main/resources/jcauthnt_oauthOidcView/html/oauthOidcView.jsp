<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<template:addResources type="javascript" resources="i18n/jahia-oauth-oidc-i18n_${renderContext.UILocale}.js"
                       var="i18nJSFile"/>
<c:if test="${empty i18nJSFile}">
    <template:addResources type="javascript" resources="i18n/jahia-oauth-oidc-i18n.js"/>
</c:if>
<template:addResources type="javascript" resources="oidc-connector-controller.js"/>

<md-card ng-controller="OidcController as oidc" ng-init="oidc.init()">
    <input type="hidden" ng-value="oidc.siteKey" ng-init="oidc.siteKey = '${renderContext.site.siteKey}'"/>

    <div layout="row">
        <md-card-title flex>
            <md-card-title-text>
                <span class="md-headline" message-key="jcauthnt_oauthOidcView"></span>
            </md-card-title-text>
        </md-card-title>
        <div flex layout="row" layout-align="end center">
            <md-button class="md-icon-button" ng-click="oidc.toggleCard()">
                <md-tooltip md-direction="top">
                    <span message-key="jcauthnt_oauthOidcView.tooltip.toggleSettings"></span>
                </md-tooltip>
                <md-icon ng-show="!oidc.expandedCard">keyboard_arrow_down</md-icon>
                <md-icon ng-show="oidc.expandedCard">keyboard_arrow_up</md-icon>
            </md-button>
        </div>
    </div>

    <md-card-content layout="column" ng-show="oidc.expandedCard">
        <form name="oidcForm">
            <md-switch ng-model="oidc.enabled">
                <span message-key="label.activate"></span>
            </md-switch>

            <div layout="row">
                <md-input-container flex>
                    <label message-key="label.apiKey"></label>
                    <input type="text" ng-model="oidc.apiKey" name="apiKey" required/>
                    <div class="hint" ng-show="oidcForm.apiKey.$valid" message-key="hint.apiKey"></div>
                    <div ng-messages="oidcForm.apiKey.$error" role="alert">
                        <div ng-message="required" message-key="error.apiKey.required"></div>
                    </div>
                </md-input-container>

                <div flex="5"></div>

                <md-switch ng-model="oidc.withPKCE" flex="initial">
                    <span ng-show="oidc.withPKCE" message-key="label.withPKCE.enabled"></span>
                    <span ng-hide="oidc.withPKCE" message-key="label.withPKCE.disabled"></span>
                </md-switch>
            </div>

            <div layout="row">
                <md-input-container flex>
                    <label message-key="label.accessTokenEndpoint"></label>
                    <input type="url" ng-model="oidc.accessTokenEndpoint" name="accessTokenEndpoint" required/>
                    <div class="hint" ng-show="oidcForm.accessTokenEndpoint.$valid"
                         message-key="hint.accessTokenEndpoint"></div>
                    <div ng-messages="oidcForm.accessTokenEndpoint.$error" role="alert">
                        <div ng-message="url" message-key="error.notAValidUrl"></div>
                        <div ng-message="required" message-key="error.accessTokenEndpoint.required"></div>
                    </div>
                </md-input-container>
            </div>
            <div layout="row">
                <md-input-container flex>
                    <label message-key="label.authorizationBaseUrl"></label>
                    <input type="url" ng-model="oidc.authorizationBaseUrl" name="authorizationBaseUrl" required/>
                    <div class="hint" ng-show="oidcForm.authorizationBaseUrl.$valid"
                         message-key="hint.authorizationBaseUrl"></div>
                    <div ng-messages="oidcForm.authorizationBaseUrl.$error" role="alert">
                        <div ng-message="url" message-key="error.notAValidUrl"></div>
                        <div ng-message="required" message-key="error.authorizationBaseUrl.required"></div>
                    </div>
                </md-input-container>
            </div>

            <div layout="row">
                <md-input-container class="md-block" flex>
                    <label message-key="label.callbackUrl"></label>
                    <input type="url" ng-model="oidc.callbackUrl" name="callbackUrl" required/>
                    <div class="hint" ng-show="oidcForm.callbackUrl.$valid" message-key="hint.callbackUrl"></div>
                    <div ng-messages="oidcForm.callbackUrl.$error" ng-show="oidcForm.callbackUrl.$invalid"
                         role="alert">
                        <div ng-message="url" message-key="error.notAValidUrl"></div>
                        <div ng-message="required" message-key="error.callbackUrl.required"></div>
                    </div>
                </md-input-container>

                <div flex="5"></div>

                <md-input-container class="md-block" flex="initial">
                    <label message-key="label.userAttribute"></label>
                    <input type="text" ng-model="oidc.userAttribute" name="userAttribute" required/>
                    <div class="hint" ng-show="oidcForm.userAttribute.$valid" message-key="hint.userAttribute"></div>
                    <div ng-messages="oidcForm.userAttribute.$error" ng-show="oidcForm.userAttribute.$invalid"
                         role="alert">
                        <div ng-message="required" message-key="error.userAttribute.required"></div>
                    </div>
                </md-input-container>
            </div>
        </form>

        <md-card-actions layout="row" layout-align="end center">
            <md-button class="md-accent" ng-click="oidc.saveSettings()" message-key="label.save"></md-button>
        </md-card-actions>

    </md-card-content>
</md-card>
