import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useMutation} from '@apollo/client';
import {useTranslation} from 'react-i18next';
import {Add, Button, Field, Input, Paper, Typography} from '@jahia/moonstone';
import {CREATE_PROVIDER} from './OidcProviders.gql';
import styles from './OidcProviders.css';

// Must match OidcConnector.PROVIDER_ID; "default" names the provider of version 2.x.
const PROVIDER_ID = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export const NewProviderForm = ({siteKey, existingIds, onCreated}) => {
    const {t} = useTranslation('jahia-oauth-oidc');
    const [providerId, setProviderId] = useState('');
    const [label, setLabel] = useState('');
    const [createProvider, {loading, error}] = useMutation(CREATE_PROVIDER);
    const isValid = PROVIDER_ID.test(providerId) && providerId !== 'default' && !existingIds.includes(providerId);

    const create = () => createProvider({variables: {siteKey, providerId, label}})
        .then(() => {
            setProviderId('');
            setLabel('');
            onCreated(providerId);
        })
        .catch(() => {
            // Shown below from the state of the mutation
        });

    return (
        <Paper hasPadding>
            <div className={styles.form}>
                <Typography variant="heading">{t('label.add.title')}</Typography>
                <div className={styles.row}>
                    <Field id="oidc-new-provider-id-field" label={t('label.add.id')} helper={t('label.add.idHelper')}>
                        <Input id="oidc-new-provider-id"
                               value={providerId}
                               onChange={e => setProviderId(e.target.value.trim())}/>
                    </Field>
                    <Field id="oidc-new-provider-label-field" label={t('label.add.label')}>
                        <Input id="oidc-new-provider-label" value={label} onChange={e => setLabel(e.target.value)}/>
                    </Field>
                </div>
                {error && <Typography className={styles.error}>{error.message}</Typography>}
                <div className={styles.actions}>
                    <Button data-test="oidc-add-provider"
                            label={t('label.add.button')}
                            icon={<Add/>}
                            color="accent"
                            isDisabled={!isValid || loading}
                            onClick={create}/>
                </div>
            </div>
        </Paper>
    );
};

NewProviderForm.propTypes = {
    siteKey: PropTypes.string.isRequired,
    existingIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    onCreated: PropTypes.func.isRequired
};
