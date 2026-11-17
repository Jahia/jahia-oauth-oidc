import React from 'react';
import PropTypes from 'prop-types';
import {useMutation} from '@apollo/client';
import {useTranslation} from 'react-i18next';
import {Switch, Typography} from '@jahia/moonstone';
import {SET_PROVIDER_ENABLED} from './OidcProviders.gql';
import styles from './OidcProviders.css';

/**
 * Turns a provider on or off from its header, at once, and leaves its other settings as they are. A provider whose
 * settings are incomplete cannot be turned on.
 */
export const ProviderEnabledSwitch = ({siteKey, provider, onChanged}) => {
    const {t} = useTranslation('jahia-oauth-oidc');
    const [setEnabled, {loading, error}] = useMutation(SET_PROVIDER_ENABLED);
    const id = `oidc-${provider.id}-enabled`;

    const toggle = (e, value, checked) => {
        setEnabled({variables: {siteKey, providerId: provider.id, enabled: checked}}).then(onChanged).catch(() => {
            // Shown below the header from the state of the mutation
        });
    };

    return (
        // The switch and its error are items of the header row: the error takes a line of its own
        <div className={styles.enabledSwitch}>
            <label className={styles.switch} htmlFor={id} data-test="oidc-provider-enabled">
                <Switch id={id} checked={provider.enabled} isDisabled={loading} onChange={toggle}/>
                <span className={styles.visuallyHidden}>{t('label.enabled')}</span>
            </label>
            {error && <Typography className={styles.headerError} data-test="oidc-provider-enabled-error">{error.message}</Typography>}
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
