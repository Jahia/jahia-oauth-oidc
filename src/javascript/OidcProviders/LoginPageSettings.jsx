import React from 'react';
import PropTypes from 'prop-types';
import {useMutation} from '@apollo/client';
import {useTranslation} from 'react-i18next';
import {Paper, Switch, Typography} from '@jahia/moonstone';
import {SET_LOGIN_PAGE} from './OidcProviders.gql';
import styles from './OidcProviders.css';

const contextPath = globalThis.contextJsParameters?.contextPath || '';

/**
 * Whether a visitor who must log in on a live page or file of the site goes to its OIDC login page.
 */
export const LoginPageSettings = ({siteKey, language, isEnabled, hasEnabledProvider, onChanged}) => {
    const {t} = useTranslation('jahia-oauth-oidc');
    const [setLoginPage, {loading, error}] = useMutation(SET_LOGIN_PAGE);
    const loginPageUrl = `${contextPath}/cms/render/live/${language}/sites/${siteKey}.oidc-login.html`;

    const toggle = (e, value, checked) => setLoginPage({variables: {siteKey, enabled: checked}}).then(onChanged).catch(() => {
        // Shown below from the state of the mutation
    });

    return (
        <Paper hasPadding>
            <div className={styles.form}>
                <Typography variant="heading">{t('label.loginPage.title')}</Typography>
                <label className={styles.switch} htmlFor="oidc-login-page-enabled" data-test="oidc-login-page-enabled">
                    <Switch id="oidc-login-page-enabled" checked={isEnabled} isDisabled={loading} onChange={toggle}/>
                    <Typography>{t('label.loginPage.enabled')}</Typography>
                </label>
                <Typography variant="caption">{t('label.loginPage.helper')}</Typography>
                {isEnabled && !hasEnabledProvider && <Typography className={styles.error}>{t('label.loginPage.noProvider')}</Typography>}
                <Typography variant="caption">
                    <a href={loginPageUrl} target="_blank" rel="noopener noreferrer">{loginPageUrl}</a>
                </Typography>
                {error && <Typography className={styles.error}>{error.message}</Typography>}
            </div>
        </Paper>
    );
};

LoginPageSettings.propTypes = {
    siteKey: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired,
    isEnabled: PropTypes.bool.isRequired,
    hasEnabledProvider: PropTypes.bool.isRequired,
    onChanged: PropTypes.func.isRequired
};
