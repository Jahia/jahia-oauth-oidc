package org.jahiacommunity.modules.oauth.oidc;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class OidcRedirectsTest {

    /**
     * A request to https://www.example.org, the only server a redirect may lead to.
     */
    private static final HttpServletRequest REQUEST = (HttpServletRequest) Proxy.newProxyInstance(
            OidcRedirectsTest.class.getClassLoader(), new Class<?>[]{HttpServletRequest.class}, (proxy, method, args) -> {
                switch (method.getName()) {
                    case "getServerName":
                        return "www.example.org";
                    case "getServerPort":
                        return 443;
                    default:
                        throw new UnsupportedOperationException(method.getName());
                }
            });

    @ParameterizedTest
    @CsvSource({
            "/sites/mysite/home/protected.html, /sites/mysite/home/protected.html",
            "/files/live/sites/mysite/files/a.pdf?v=2, /files/live/sites/mysite/files/a.pdf?v=2",
            "https://www.example.org/en/sites/mysite/page.html?a=1, /en/sites/mysite/page.html?a=1",
            "https://WWW.EXAMPLE.ORG:443/page.html, /page.html"
    })
    void keepsAPageOfThisServer(String redirect, String expected) {
        assertEquals(expected, OidcRedirects.toLocalPath(REQUEST, redirect));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "https://elsewhere.example.org/page.html",
            "https://www.example.org:8443/page.html",
            "http://www.example.org/page.html",
            "//elsewhere.example.org/page.html",
            "/\\elsewhere.example.org",
            "javascript:alert(1)",
            "page.html",
            "/page.html\r\nSet-Cookie: a=b",
            "https://www.example.org"
    })
    void dropsAnyOtherRedirect(String redirect) {
        assertNull(OidcRedirects.toLocalPath(REQUEST, redirect));
    }
}
