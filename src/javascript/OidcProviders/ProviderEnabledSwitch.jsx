import React from 'react';
import PropTypes from 'prop-types';
import {useMutation} from '@apollo/client';
import {useTranslation} from 'react-i18next';
import {Switch, Typography} from '@jahia/moonstone';
import {SAVE_PROVIDER} from './OidcProviders.gql';
import {toForm} from './ProviderForm';
import styles from './OidcProviders.css';

/**
 * Turns a provider on or off from its header, at once: the stored settings are saved back with the new state,
 * and an empty secret keeps the stored one. A provider whose settings are incomplete cannot be turned on.
 */
export const ProviderEnabledSwitch = ({siteKey, provider, onChanged}) => {
    const {t} = useTranslation('jahia-oauth-oidc');
    const [saveProvider, {loading, error}] = useMutation(SAVE_PROVIDER);
    const id = `oidc-${provider.id}-enabled`;

    const toggle = (e, value, checked) => {
        const settings = toForm(provider);
        saveProvider({
            variables: {
                siteKey,
                providerId: provider.id,
                settings: {...settings, enabled: checked, order: Number.parseInt(settings.order, 10) || 0}
            }
        }).then(onChanged).catch(() => {
            // Shown below from the state of the mutation
        });
    };

    return (
        <div className={styles.enabledSwitch}>
            <label className={styles.switch} htmlFor={id} data-test="oidc-provider-enabled">
                <Switch id={id} checked={provider.enabled} isDisabled={loading} onChange={toggle}/>
                <Typography>{t(provider.enabled ? 'label.enabled' : 'label.disabled')}</Typography>
            </label>
            {error && <Typography className={styles.error} data-test="oidc-provider-enabled-error">{error.message}</Typography>}
        </div>
    );
};

ProviderEnabledSwitch.propTypes = {
    siteKey: PropTypes.string.isRequired,
    provider: PropTypes.shape({
        id: PropTypes.string.isRequired,
        enabled: PropTypes.bool.isRequired
    }).isRequired,
    onChanged: PropTypes.func.isRequired
};
