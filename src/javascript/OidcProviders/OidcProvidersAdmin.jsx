import React from 'react';
import {useQuery} from '@apollo/client';
import {useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {Header, LayoutContent, Typography} from '@jahia/moonstone';
import {GET_PROVIDERS} from './OidcProviders.gql';
import {LoginPageSettings} from './LoginPageSettings';
import {NewProviderForm} from './NewProviderForm';
import {ProviderEnabledSwitch} from './ProviderEnabledSwitch';
import {ProviderForm} from './ProviderForm';
import styles from './OidcProviders.css';

// The settings that turning a provider on requires, as the server checks them
const isComplete = provider => [provider.clientId, provider.accessTokenEndpoint, provider.authorizationBaseUrl, provider.callbackUrl]
    .every(value => Boolean(value?.trim()));

/**
 * Site settings > OpenID Connect: add the providers of the site, configure each one, and delete them. The settings
 * of a provider show while it is on, and while it still lacks what turning it on requires.
 */
export const OidcProvidersAdmin = () => {
    const {t} = useTranslation('jahia-oauth-oidc');
    const siteKey = useSelector(state => state.site);
    const language = useSelector(state => state.language);
    const {data, loading, error, refetch} = useQuery(GET_PROVIDERS, {variables: {siteKey}, fetchPolicy: 'network-only'});
    const providers = data?.oidcProviders || [];

    const onCreated = () => refetch();
    const onDeleted = () => refetch();

    return (
        <LayoutContent
            hasPadding
            isLoading={loading && !data}
            header={<Header title={t('label.title')} contentType={t('label.description')}/>}
            content={(
                <div className={styles.content} data-test="oidc-providers-admin">
                    {data && (
                        <LoginPageSettings siteKey={siteKey}
                                           language={language}
                                           isEnabled={data.oidcLoginPageEnabled}
                                           hasEnabledProvider={providers.some(provider => provider.enabled)}
                                           onChanged={refetch}/>
                    )}
                    <NewProviderForm siteKey={siteKey}
                                     existingIds={providers.map(provider => provider.id)}
                                     onCreated={onCreated}/>
                    {error && <Typography className={styles.error}>{error.message}</Typography>}
                    {data && providers.length === 0 && <Typography>{t('label.none')}</Typography>}
                    {providers.map(provider => {
                        const isShown = provider.enabled || !isComplete(provider);
                        return (
                            <div key={provider.id} data-test="oidc-provider-card" data-provider={provider.id}>
                                <div className={styles.providerHeaderRow}>
                                    <ProviderEnabledSwitch siteKey={siteKey} provider={provider} onChanged={refetch}/>
                                    <div className={styles.providerHeader}>
                                        <Typography variant="heading" weight="bold">{provider.label}</Typography>
                                        <Typography variant="caption">{provider.id}</Typography>
                                    </div>
                                </div>
                                {/* Kept mounted while hidden, so that unsaved changes survive */}
                                <div id={`oidc-provider-${provider.id}`} hidden={!isShown}>
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
