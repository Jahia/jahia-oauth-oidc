# jahia-oauth-oidc
This module is a generic implementation of OAuth protocol authentication.

## Configuration
* **Client ID** is mandatory
* **Client secret** is mandatory
* Enable **PKCE** security, disabled by default
* OIDC **scope** (comma separated): *openid,profile,profile:read_all,activity:read_all for instance*
* **Authentication** token could be in HTTP header Authorization **Basic** or HTTP **Body** request
* **Access token endpoint URL** ends with **/token**
* **Authorization base URL** ends with **/auth** or **/authorize**
* **Callback URL** must be public and must end by **.oidc-callback.do**
* **Profile URL** is optional and could give user information
* **Return mode** is a choicelist between
  * **Homepage**: go to the site homepage
  * **Return URL**: a specific page URL
  * **Cookie name**: the cookie name in which the URL is saved

## Mapper
Once configuration is done, you can set up some mappers.

You can rely on this mapper [jcr-auth-provider](https://store.jahia.com/contents/modules-repository/org/jahia/modules/jcr-auth-provider.html) and map any token field you want to Jahia user property.
You have to map a special mandatory attribute to **SSO_LOGIN** (Login username).

## Work in progress
Do we need to manage SSO logout?

If you encounter an issue, please open a Github issue.
