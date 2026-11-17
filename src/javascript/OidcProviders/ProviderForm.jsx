import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useMutation} from '@apollo/client';
import {useTranslation} from 'react-i18next';
import {Button, Checkbox, Delete, Dropdown, Field, Input, OpenInNew, Paper, Save, Typography} from '@jahia/moonstone';
import {DELETE_PROVIDER, SAVE_PROVIDER} from './OidcProviders.gql';
import styles from './OidcProviders.css';

const contextPath = globalThis.contextJsParameters?.contextPath || '';

export const toForm = provider => ({
    enabled: provider.enabled,
    label: provider.label || '',
    logoUrl: provider.logoUrl || '',
    order: String(provider.order ?? 0),
    clientId: provider.clientId || '',
    clientSecret: '',
    scope: provider.scope || 'openid profile email',
    authentication: provider.authentication,
    withPKCE: provider.withPKCE,
    accessTokenEndpoint: provider.accessTokenEndpoint || '',
    authorizationBaseUrl: provider.authorizationBaseUrl || '',
    callbackUrl: provider.callbackUrl || '',
    profileUrl: provider.profileUrl || '',
    returnMode: provider.returnMode,
    returnUrl: provider.returnUrl || '',
    returnCookie: provider.returnCookie || ''
});

const TextField = ({providerId, name, label, helper, value, onChange, isRequired, type}) => {
    const id = `oidc-${providerId}-${name}`;
    return (
        <Field id={`${id}-field`} label={isRequired ? `${label} *` : label} helper={helper}>
            <Input id={id} type={type} value={value} onChange={e => onChange(name, e.target.value)}/>
        </Field>
    );
};

TextField.propTypes = {
    providerId: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    helper: PropTypes.string,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    isRequired: PropTypes.bool,
    type: PropTypes.string
};

const CheckboxField = ({providerId, name, label, isChecked, onChange}) => (
    <label className={styles.switch} htmlFor={`oidc-${providerId}-${name}`} data-test={`oidc-${providerId}-${name}`}>
        <Checkbox id={`oidc-${providerId}-${name}`} checked={isChecked} onChange={(e, value, checked) => onChange(name, checked)}/>
        <Typography>{label}</Typography>
    </label>
);

CheckboxField.propTypes = {
    providerId: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    isChecked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
};

/**
 * The settings of one provider. The stored client secret is never sent to the browser: an empty field keeps it.
 */
export const ProviderForm = ({siteKey, language, provider, onSaved, onDeleted}) => {
    const {t} = useTranslation('jahia-oauth-oidc');
    const [form, setForm] = useState(() => toForm(provider));
    const [saved, setSaved] = useState(false);
    const [saveProvider, saveState] = useMutation(SAVE_PROVIDER);
    const [deleteProvider, deleteState] = useMutation(DELETE_PROVIDER);
    const providerId = provider.id;

    // The header switches a provider on and off: that alone must not drop the changes not saved yet.
    const providerKey = JSON.stringify({...provider, enabled: null});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setForm(toForm(provider)), [providerKey]);

    const change = (name, value) => {
        setSaved(false);
        setForm(previous => ({...previous, [name]: value}));
    };

    const save = () => saveProvider({
        variables: {
            siteKey,
            providerId,
            settings: {...form, enabled: provider.enabled, order: Number.parseInt(form.order, 10) || 0}
        }
    }).then(() => {
        setSaved(true);
        onSaved();
    }).catch(() => setSaved(false));

    const remove = () => {
        // eslint-disable-next-line no-alert
        if (globalThis.confirm(t('label.delete.confirm', {label: provider.label}))) {
            deleteProvider({variables: {siteKey, providerId}}).then(onDeleted).catch(() => {
                // Shown below from the state of the mutation
            });
        }
    };

    const openMappers = () => globalThis.open(`${contextPath}/cms/editframe/default/${language}/sites/${siteKey}.auth-connector-site-settings.html?redirect=false#/mappers/${provider.connectorServiceName}`, '_blank', 'noopener');

    const suggestedCallbackUrl = `${globalThis.location.origin}${contextPath}/cms/render/live/${language}/sites/${siteKey}.oidc-callback.do`;
    const options = values => values.map(value => ({value, label: t(`label.option.${value}`)}));
    const authentications = options(['basic', 'body']);
    const returnModes = options(['homepage', 'url', 'cookie']);
    const error = saveState.error || deleteState.error;
    const field = (name, label, extra = {}) => (
        <TextField providerId={providerId} name={name} label={label} value={form[name]} onChange={change} {...extra}/>
    );

    return (
        <Paper hasPadding>
            <div className={styles.form} data-test="oidc-provider-form">
                <div className={styles.row}>
                    {field('label', t('label.field.label'), {helper: t('label.field.labelHelper')})}
                    {field('logoUrl', t('label.field.logoUrl'), {helper: t('label.field.logoUrlHelper')})}
                    <div className={styles.narrow}>{field('order', t('label.field.order'), {type: 'number'})}</div>
                </div>

                <div className={styles.row}>
                    {field('clientId', t('label.field.clientId'), {isRequired: true})}
                    {field('clientSecret', t('label.field.clientSecret'), {
                    type: 'password',
                    helper: t(provider.hasClientSecret ? 'label.field.clientSecretStored' : 'label.field.clientSecretNone')
                })}
                </div>

                <div className={styles.row}>
                    {field('scope', t('label.field.scope'), {helper: t('label.field.scopeHelper')})}
                    <Field id={`oidc-${providerId}-authentication-field`} label={t('label.field.authentication')}>
                        <Dropdown label={t(`label.option.${form.authentication}`)}
                                  value={form.authentication}
                                  data={authentications}
                                  onChange={(e, item) => change('authentication', item.value)}/>
                    </Field>
                    <div className={styles.checkboxCell}>
                        <CheckboxField providerId={providerId} name="withPKCE" label={t('label.field.withPKCE')} isChecked={form.withPKCE} onChange={change}/>
                    </div>
                </div>

                {field('authorizationBaseUrl', t('label.field.authorizationBaseUrl'), {isRequired: true, helper: t('label.field.authorizationBaseUrlHelper')})}
                {field('accessTokenEndpoint', t('label.field.accessTokenEndpoint'), {isRequired: true, helper: t('label.field.accessTokenEndpointHelper')})}
                {field('profileUrl', t('label.field.profileUrl'), {helper: t('label.field.profileUrlHelper')})}
                {field('callbackUrl', t('label.field.callbackUrl'), {isRequired: true, helper: t('label.field.callbackUrlHelper', {url: suggestedCallbackUrl})})}

                <div className={styles.row}>
                    <Field id={`oidc-${providerId}-returnMode-field`} label={t('label.field.returnMode')}>
                        <Dropdown label={t(`label.option.${form.returnMode}`)}
                                  value={form.returnMode}
                                  data={returnModes}
                                  onChange={(e, item) => change('returnMode', item.value)}/>
                    </Field>
                    {form.returnMode === 'url' && field('returnUrl', t('label.field.returnUrl'), {isRequired: true})}
                    {form.returnMode === 'cookie' && field('returnCookie', t('label.field.returnCookie'), {isRequired: true})}
                </div>

                {error && <Typography className={styles.error} data-test="oidc-provider-error">{error.message}</Typography>}
                {saved && <Typography className={styles.success} data-test="oidc-provider-saved">{t('label.saved')}</Typography>}

                <div className={styles.actions}>
                    <Button data-test="oidc-delete-provider"
                            label={t('label.delete.button')}
                            icon={<Delete/>}
                            color="danger"
                            variant="outlined"
                            isDisabled={deleteState.loading}
                            onClick={remove}/>
                    <Button data-test="oidc-mappers"
                            label={t('label.mappers')}
                            icon={<OpenInNew/>}
                            variant="outlined"
                            onClick={openMappers}/>
                    <Button data-test="oidc-save-provider"
                            label={t('label.save')}
                            icon={<Save/>}
                            color="accent"
                            isDisabled={saveState.loading}
                            onClick={save}/>
                </div>
            </div>
        </Paper>
    );
};

ProviderForm.propTypes = {
    siteKey: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired,
    provider: PropTypes.shape({
        id: PropTypes.string.isRequired,
        connectorServiceName: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        enabled: PropTypes.bool.isRequired,
        hasClientSecret: PropTypes.bool.isRequired
    }).isRequired,
    onSaved: PropTypes.func.isRequired,
    onDeleted: PropTypes.func.isRequired
};
