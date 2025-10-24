(function () {
    'use strict';

    angular.module('JahiaOAuthApp').controller('OidcController', OidcController);
    OidcController.$inject = ['$location', 'settingsService', 'helperService', 'i18nService'];

    function OidcController($location, settingsService, helperService, i18nService) {
        // must mach value in the plugin in pom.xml
        i18nService.addKey(jcauthoidci18n);

        const CONNECTOR_SERVICE_NAME = 'OidcConnector';

        const vm = this;

        vm.saveSettings = () => {
            // Value can't be empty
            if (!vm.siteKey || !vm.apiKey || !vm.accessTokenEndpoint || !vm.authorizationBaseUrl || !vm.callbackUrl || vm.callbackUrl.trim() === '' || !vm.returnMode || (vm.returnMode === 'url' && !vm.returnUrl) || (vm.returnMode === 'cookie' && !vm.returnCookie) || !vm.userAttribute || vm.userAttribute.trim() === '') {
                helperService.errorToast(i18nService.message('label.missingMandatoryProperties'));
                console.log(vm);
                return false;
            }

            const properties = {
                oauthApiName: `${CONNECTOR_SERVICE_NAME}-${vm.siteKey}`,
                enabled: vm.enabled,
                apiKey: vm.apiKey,
                apiSecret: vm.apiSecret || 'DEFAULT_SECRET_UNUSED',
                scope: vm.scope,
                authentication: vm.authentication,
                accessTokenEndpoint: vm.accessTokenEndpoint,
                authorizationBaseUrl: vm.authorizationBaseUrl,
                withPKCE: vm.withPKCE,
                callbackUrl: vm.callbackUrl,
                profileUrl: vm.profileUrl,
                userAttribute: vm.userAttribute,
                returnMode: vm.returnMode
            };
            if (vm.returnMode === 'url') {
                properties.returnUrl = vm.returnUrl;
            }
            if (vm.returnMode === 'cookie') {
                properties.returnCookie = vm.returnCookie;
            }

            // the node name here must be the same as the one in your spring file
            settingsService.setConnectorData({
                connectorServiceName: CONNECTOR_SERVICE_NAME,
                properties
            }).success(() => {
                vm.connectorHasSettings = true;
                helperService.successToast(i18nService.message('label.saveSuccess'));
            }).error(data => helperService.errorToast(`${i18nService.message('jcauthnt_oauthOidcView')}: ${data.error}`));
        };

        vm.toggleCard = () => vm.expandedCard = !vm.expandedCard;

        vm.init = () => {
            settingsService.getConnectorData(CONNECTOR_SERVICE_NAME, ['enabled', 'apiKey', 'apiSecret', 'scope', 'authentication', 'accessTokenEndpoint', 'authorizationBaseUrl', 'withPKCE', 'callbackUrl', 'returnMode', 'returnUrl', 'returnCookie', 'profileUrl', 'userAttribute'])
                .success(data => {
                    if (data && !angular.equals(data, {})) {
                        vm.expandedCard = vm.connectorHasSettings = true;
                        vm.enabled = data.enabled;
                        vm.apiKey = data.apiKey;
                        vm.apiSecret = data.apiSecret;
                        vm.scope = data.scope;
                        vm.authentication = data.authentication || 'basic';
                        vm.accessTokenEndpoint = data.accessTokenEndpoint;
                        vm.authorizationBaseUrl = data.authorizationBaseUrl;
                        vm.withPKCE = data.withPKCE === 'true';
                        vm.callbackUrl = data.callbackUrl || '';
                        vm.returnMode = data.returnMode || 'homepage';
                        if (vm.returnMode === 'url') vm.returnUrl = data.returnUrl || '';
                        if (vm.returnMode === 'cookie') vm.returnCookie = data.returnCookie || '';
                        vm.profileUrl = data.profileUrl || '';
                        vm.userAttribute = data.userAttribute || '';
                    } else {
                        vm.connectorHasSettings = false;
                        vm.enabled = false;
                        vm.authentication = 'basic';
                        vm.returnMode = 'homepage';
                    }
                })
                .error(data => helperService.errorToast(`${i18nService.message('jcauthnt_oauthOidcView')}: ${data.error}`));
        };
    }
})();
