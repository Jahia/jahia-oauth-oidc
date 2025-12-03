# jahia-oauth-oidc
This module is a generic implementation of OAuth protocol authentication.

## Configuration
* **Client ID** is mandatory
* **Client secret** is mandatory
* Enable **PKCE** security, disabled by default ([Documentation](https://www.rfc-editor.org/rfc/rfc7636))
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

![Jahia Authentication site settings](/docs/jahia-authentication.png "Jahia Authentication site settings")

## Mapper
Once configuration is done, you can set up some mappers.

You can rely on this mapper [jcr-auth-provider](https://store.jahia.com/contents/modules-repository/org/jahia/modules/jcr-auth-provider.html) and map any token field you want to Jahia user property.<br/>
You have to map a special mandatory attribute to **SSO_LOGIN** (Login username).<br/>
Once logged, you can choose to createa the user at server or site level, or not.

![JCR auth provider mapper](/docs/jahia-authentication.png "JCR auth provider mapper")

## Work in progress
If you encounter any problem or have any suggestion, please open a Github issue.

**Ideas**:
* Do we need to manage SSO logout?
