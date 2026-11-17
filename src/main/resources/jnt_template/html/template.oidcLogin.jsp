<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<!DOCTYPE html>
<html lang="${renderContext.mainResourceLocale.language}">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title><fmt:message key="oidcLoginPage.title"/> - ${fn:escapeXml(renderContext.site.title)}</title>
</head>
<body class="oidc-login-page">
<main>
    <h1>${fn:escapeXml(renderContext.site.title)}</h1>
    <template:area path="pagecontent"/>
</main>
</body>
</html>
