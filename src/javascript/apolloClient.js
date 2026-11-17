import {ApolloClient, HttpLink, InMemoryCache} from '@apollo/client';

const contextPath = window.contextJsParameters?.contextPath || '';

/**
 * The module's own GraphQL client: @apollo/client is bundled, not shared, so the page provides its own client.
 */
export const apolloClient = new ApolloClient({
    link: new HttpLink({uri: `${contextPath}/modules/graphql`, credentials: 'same-origin'}),
    cache: new InMemoryCache()
});
