<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>${fn:escapeXml(renderContext.mainResource.node.displayableName)}</title>
</head>
<body>
<div class="bodywrapper">
    <%-- Lets the suite tell the redirect targets apart (home vs return-target vs oidc). --%>
    <div data-test="page-name">${fn:escapeXml(renderContext.mainResource.node.name)}</div>

    <div class="user-info">
        <c:choose>
            <c:when test="${renderContext.loggedIn}">
                <div data-test="user-logged-in">
                    <p>Username:<span data-test="username">${fn:escapeXml(renderContext.user.username)}</span></p>
                    <c:forEach var="prop" items="${renderContext.user.properties}">
                        <c:if test="${not empty prop.value}">
                            <p>${fn:escapeXml(prop.key)}:<span data-test="${prop.key}">${fn:escapeXml(prop.value)}</span></p>
                        </c:if>
                    </c:forEach>
                </div>
            </c:when>
            <c:otherwise>
                <div data-test="user-guest">Guest</div>
            </c:otherwise>
        </c:choose>
    </div>

    <template:area path="pagecontent"/>
</div>
</body>
</html>
