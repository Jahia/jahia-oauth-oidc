#!/bin/bash
source ./set-env.sh

# Keycloak's log is the fastest way to tell a test failure (bad assertion) from an IdP
# rejection (bad client config, PKCE mismatch, issuer mismatch).
docker logs jahia-oidc-keycloak > ./artifacts/results/keycloak.log 2>&1
