import React, {useState} from 'react';
import {useQuery} from '@apollo/client';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {Chip, Collapsible, Header, LayoutContent, Typography} from '@jahia/moonstone';
import {GET_PROVIDERS} from './OidcProviders.gql';
import {NewProviderForm} from './NewProviderForm';
import {ProviderForm} from './ProviderForm';
import styles from './OidcProviders.css';

/**
 * Site settings > OpenID Connect: add the providers of the site, configure each one, and delete them.
 */
export const OidcProvidersAdmin = () => {
    const {t} = useTranslation('jahia-oauth-oidc');
    const siteKey = useSelector(state => state.site);
    const language = useSelector(state => state.language);
    const {data, loading, error, refetch} = useQuery(GET_PROVIDERS, {variables: {siteKey}, fetchPolicy: 'network-only'});
    const [expandedId, setExpandedId] = useState(null);
    const providers = data?.oidcProviders || [];

    const onCreated = providerId => refetch().then(() => setExpandedId(providerId));
    const onDeleted = () => refetch().then(() => setExpandedId(null));

    return (
        <LayoutContent
            hasPadding
            isLoading={loading && !data}
            header={<Header title={t('label.title')} contentType={t('label.description')}/>}
            content={(
                <div className={styles.content} data-test="oidc-providers-admin">
                    <NewProviderForm siteKey={siteKey}
                                     existingIds={providers.map(provider => provider.id)}
                                     onCreated={onCreated}/>
                    {error && <Typography className={styles.error}>{error.message}</Typography>}
                    {data && providers.length === 0 && <Typography>{t('label.none')}</Typography>}
                    {providers.map(provider => (
                        <div key={provider.id} data-test="oidc-provider-card" data-provider={provider.id}>
                            <Collapsible id={`oidc-provider-${provider.id}`}
                                         label={`${provider.label} (${provider.id})`}
                                         isExpanded={expandedId === provider.id}
                                         onClick={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
                            >
                                <Chip label={t(provider.enabled ? 'label.enabled' : 'label.disabled')}
                                      color={provider.enabled ? 'success' : 'default'}/>
                                <ProviderForm siteKey={siteKey}
                                              language={language}
                                              provider={provider}
                                              onSaved={refetch}
                                              onDeleted={onDeleted}/>
                            </Collapsible>
                        </div>
                    ))}
                </div>
            )}
        />
    );
};
