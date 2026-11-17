import React, {useState} from 'react';
import {useQuery} from '@apollo/client';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {ChevronDown, ChevronRight, Chip, Header, LayoutContent, Typography} from '@jahia/moonstone';
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
                    {providers.map(provider => {
                        const isExpanded = expandedId === provider.id;
                        return (
                            <div key={provider.id} data-test="oidc-provider-card" data-provider={provider.id}>
                                {/* Moonstone's Collapsible takes a text label only: the status needs its own header */}
                                <button type="button"
                                        className={styles.providerHeader}
                                        aria-expanded={isExpanded}
                                        aria-controls={`oidc-provider-${provider.id}`}
                                        onClick={() => setExpandedId(isExpanded ? null : provider.id)}
                                >
                                    {isExpanded ? <ChevronDown/> : <ChevronRight/>}
                                    <Typography variant="heading" weight="bold">{provider.label}</Typography>
                                    <Typography variant="caption">{provider.id}</Typography>
                                    <Chip label={t(provider.enabled ? 'label.enabled' : 'label.disabled')}
                                          color={provider.enabled ? 'success' : 'default'}/>
                                </button>
                                {/* Kept mounted while collapsed, so that unsaved changes survive */}
                                <div id={`oidc-provider-${provider.id}`} hidden={!isExpanded}>
                                    <ProviderForm siteKey={siteKey}
                                                  language={language}
                                                  provider={provider}
                                                  onSaved={refetch}
                                                  onDeleted={onDeleted}/>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        />
    );
};
