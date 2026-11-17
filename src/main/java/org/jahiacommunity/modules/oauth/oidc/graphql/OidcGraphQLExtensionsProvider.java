package org.jahiacommunity.modules.oauth.oidc.graphql;

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;

import java.util.Arrays;
import java.util.Collection;

/**
 * Adds the OIDC providers to the Jahia GraphQL API.
 */
@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)
public class OidcGraphQLExtensionsProvider implements DXGraphQLExtensionsProvider {
    @Override
    public Collection<Class<?>> getExtensions() {
        return Arrays.asList(OidcQueryExtensions.class, OidcMutationExtensions.class);
    }
}
