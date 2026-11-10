#!/bin/bash

source ./set-env.sh

# In CI the browser runs inside the `cypress` container, on the same Docker network as
# Keycloak — so it reaches the IdP by a network alias rather than on localhost. This
# drives BOTH the URL Cypress is redirected to AND Keycloak's pinned KC_HOSTNAME, which
# have to agree or the token's `iss` is rejected at /userinfo. Locally the browser runs
# on the host and the compose default (http://localhost:8081) applies instead.
#
# The alias is a subdomain of jahia.test, which the jahia service also answers to, so
# the browser sees both under one registrable domain. Without that the login form POST
# is cross-site, Keycloak's SameSite=Lax auth-session cookie is withheld, and every
# interactive login fails with LOGIN_ERROR error="cookie_not_found".
export KEYCLOAK_PUBLIC_URL=http://keycloak.jahia.test:8081

echo " == Printing the most important environment variables"
echo " MANIFEST: ${MANIFEST}"
echo " TESTS_IMAGE: ${TESTS_IMAGE}"
echo " JAHIA_IMAGE: ${JAHIA_IMAGE}"
echo " MODULE_ID: ${MODULE_ID}"
echo " JAHIA_URL: ${JAHIA_URL}"
echo " KEYCLOAK_PUBLIC_URL: ${KEYCLOAK_PUBLIC_URL}"

version=$(node -p "require('./package.json').devDependencies['@jahia/cypress']")
echo Using @jahia/cypress@$version...
npx --yes --package @jahia/cypress@$version ci.startup
