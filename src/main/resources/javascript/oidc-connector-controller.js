(function () {
    'use strict';

    angular.module('JahiaOAuthApp').controller('OidcLinkCardController', OidcLinkCardController);
    OidcLinkCardController.$inject = ['$element', 'i18nService'];

    // Gives the mappers screen of each provider a title: jahia-authentication reads it from the key <connector>.title.
    function OidcLinkCardController($element, i18nService) {
        this.$postLink = () => {
            const keys = {};
            $element[0].querySelectorAll('.oidc-provider').forEach(item => {
                keys[`${item.dataset.connector}.title`] = `OIDC Mappers - ${item.dataset.label}`;
            });
            i18nService.addKey(keys);
        };
    }
})();
