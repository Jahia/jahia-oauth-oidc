# jahia-oauth-oidc — Cypress e2e tests

End-to-end tests for the OIDC connector, driven against a **real Keycloak** identity
provider rather than a stubbed OAuth server. A run exercises the genuine
authorization-code flow: Keycloak renders its own login form, issues a real code, and
Jahia exchanges it server-side for a real token before calling `/userinfo`.

## What is covered

| Spec | Covers |
|---|---|
| `oidc-authentication-flows.cy.ts` | The authorization-code flow across two dimensions the connector implements itself: client authentication at the token endpoint (**HTTP Basic** vs **request body**) × **PKCE on/off**. Plus: a PKCE-requiring client refusing a connector configured without PKCE. |
| `oidc-return-modes.cy.ts` | Where the callback sends the user afterwards — `homepage`, `url`, `cookie`, and the fallback when the named cookie is absent. |
| `oidc-callback-errors.cy.ts` | `.oidc-callback.do` on its own: missing code, blank code, invalid code. |

The PKCE cases run against a Keycloak client configured to **require** S256, so they
fail if no `code_challenge` is actually sent — they cannot pass vacuously.

## Prerequisites

- Docker, Node and yarn.
- A Jahia EE license (base64) in `.env` — see `.env.example`.

## Running

`docker-compose.yml` brings up the whole environment: **Jahia** on `:8080` and **Keycloak**
on `:8081`.

```bash
cd tests

cp .env.example .env      # then paste your base64 license into JAHIA_LICENSE
yarn install
yarn env:up               # Jahia + Keycloak, waits until both are healthy
                          # (the CI-only `cypress` service is not started)
```

Jahia then needs the modules the suite exercises. From the repo root:

```bash
# dependencies, resolved by the instance from their mvn: coordinates
curl -u root:root1234 -X POST http://localhost:8080/modules/api/provisioning \
  -H "Content-Type: application/yaml" --data-binary @tests/assets/dependencies.yml

# the module under test + the test template set
(cd .. && mvn clean install -DskipTests)
(cd jahia-module && mvn clean install -DskipTests)
# the `;type=text/yaml` matters — without it the script part is parsed as JSON and 500s
curl -u root:root1234 -X POST http://localhost:8080/modules/api/provisioning \
  -F "script=@assets/deploy-modules.yml;type=text/yaml" \
  -F file=@../target/jahia-oauth-oidc-2.0.2-SNAPSHOT.jar \
  -F file=@jahia-module/target/jahia-oauth-oidc-test-module-2.0.2-SNAPSHOT.jar
```

Then run the tests:

```bash
yarn e2e:debug            # interactive Cypress runner
yarn e2e:ci               # headless run

yarn env:down             # tear the environment down and drop its state
```

A module stuck at `INSTALLED` instead of `ACTIVE` after deploy almost always means one of
the dependencies is missing.

Point the suite at a different Jahia with `JAHIA_URL`:

```bash
JAHIA_URL=http://localhost:8380 yarn e2e:ci
```

## The two Keycloak URLs

Keycloak is reached under **two different hosts on purpose**, and this is the one piece of
the setup worth understanding before changing anything:

- the **browser** is redirected to the *authorization* endpoint — it runs on your host, so
  it uses `http://localhost:8081`;
- **Jahia** calls the *token* and *userinfo* endpoints itself, from inside its container,
  so it uses the compose service name, `http://keycloak:8081`.

The connector exposes those as three independent properties (`authorizationBaseUrl`,
`accessTokenEndpoint`, `profileUrl`), so the split is expressible directly.

**This is why `KC_HOSTNAME` is pinned in `docker-compose.yml`.** Keycloak stamps the `iss`
claim into the token from whichever host it was reached on, and then validates that same
`iss` when the token is presented at `/userinfo`. With the browser arriving on `localhost`
and Jahia arriving on `keycloak`, the token gets minted for one host and rejected at the
other with `Invalid token issuer`. Pinning the hostname makes the issuer identical on both
paths. Don't remove it.

Override either side if your setup differs:

```bash
KEYCLOAK_BROWSER_URL=http://localhost:8081 \
KEYCLOAK_INTERNAL_URL=http://keycloak:8081 \
yarn e2e:ci
```

Because Cypress treats `localhost:8080` and `localhost:8081` as separate origins, every
interaction with a Keycloak page happens inside `cy.origin()` — see
`cypress/support/keycloak.ts`.

## The test realm

`keycloak/realm-export.json` is imported on every container start, so recreating the
container resets the IdP to a known state. It defines:

- **`jahia-oidc-nopkce`** — confidential client, PKCE optional. Accepts both client
  authentication methods, so it backs the non-PKCE flows.
- **`jahia-oidc-pkce`** — confidential client, **PKCE S256 required**.
- users **`oidc.user`** and **`other.user`**, password `Passw0rd!`.

Redirect URIs are wildcarded because each test creates a site under a random key. That is
fine for a throwaway local realm; do not copy the client definitions into a real one.

## How a test is wired

Each test creates its own site (random key, `jahia-oauth-oidc-test-module` template set),
then installs the connector configuration as an OSGi factory configuration —
`org.jahia.modules.auth-<siteKey>.cfg`, keyed by a top-level `siteKey` property — via the
provisioning API. Installing that file is what makes jahia-authentication call
`OidcConnector.validateSettings()`, which registers the `OidcConnector-<siteKey>` OAuth
API; without it the flow cannot start.

Claim mapping is done by **jcr-auth-provider**. `OidcConnector.getAvailableProperties()`
returns an empty list, so nothing resolves from a connector-declared schema and jahia-oauth
falls back to a top-level lookup on the userinfo JSON. The mapping therefore uses the raw
OIDC claim names — `sub`, `email`, `given_name`, `family_name` — not friendly aliases.
See `cypress/support/oidc-connector.ts`.

## CI

Three workflows under `.github/workflows/` run this suite through the standard Jahia
harness (`Jahia/jahia-modules-action`):

| Workflow | Trigger |
|---|---|
| `on-code-change.yml` | every pull request — signature, static analysis, build, Sonar, then the suite |
| `nightly.yml` | 01:00 daily, against both `jahia/jahia-ee:8` and the dev snapshot |
| `manual-run.yml` | on demand, against any Jahia image |

Each one **builds the module first**. Most Jahia modules also ship a
`provisioning-manifest-snapshot.yml` that pulls the module from Nexus, but this module
sets `maven.deploy.skip`, so it is never published — there is only
`provisioning-manifest-build.yml`, and the module plus `tests/jahia-module` are always
deployed from the build artifacts. (`jahia-modules-action/build` picks up
`tests/jahia-module/` automatically.)

In CI the browser runs inside the `cypress` container rather than on your host, so it
reaches Keycloak by service name. `ci.startup.sh` exports `KEYCLOAK_PUBLIC_URL=http://keycloak:8081`
for exactly that reason — it drives both the URL Cypress is redirected to and the pinned
`KC_HOSTNAME`, which must agree (see above).

## Two things that will look wrong but are deliberate

**The connector configuration is installed twice.** jahia-authentication only calls
`ConnectorService.validateSettings()` when it updates a configuration it already knows —
`SettingsServiceImpl.updated()` does it in its else-branch only, and the first callback for
a brand-new pid takes the other branch. Most jahia-oauth connectors don't notice, because
their APIs are registered statically at service activation; this one registers
`OidcConnector-<siteKey>` *from* `validateSettings()`, so on a first-ever install it is
never registered and `.oidc-connect.do` fails with a 500. The second install carries a
nonce so the properties genuinely differ — Config Admin skips a no-op update.

**`support/e2e.ts` visits a Jahia page before every test.** These specs navigate the
browser to Keycloak, a different origin. `cy.apollo` issues its request from the
application under test, so a test starting with the runner still pointed at Keycloak dies
on the first Apollo call in a setup helper with `Network request failed` — surfacing as a
confusing `Cannot read properties of undefined (reading 'filter')` inside @jahia/cypress's
publication helper. The visit makes the starting origin deterministic.

## Note on the `scope` property

The tests send a **space-separated** scope (`openid profile email`), per RFC 6749. The
module README documents the scope as comma separated; a comma-separated value is sent
verbatim to the provider and Keycloak reads it as one unknown scope, which yields a token
without the `profile`/`email` claims the mapping depends on.
