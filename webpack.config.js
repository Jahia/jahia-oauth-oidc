const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {DefinePlugin} = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const getModuleFederationConfig = require('@jahia/webpack-config/getModuleFederationConfig');
const packageJson = require('./package.json');

// React, Moonstone, i18next, react-redux and ui-extender are shared singletons that the running Jahia provides
// (import: false), never bundled. Apollo is bundled: the module provides its own client (src/javascript/apolloClient.js).
const moduleFederationConfig = getModuleFederationConfig(packageJson);
delete moduleFederationConfig.shared['@apollo/client'];

// The checksum of each locale file. The app-shell requests a namespace listed in window.jahia.localeFiles under a
// versioned URL, so an upgrade of the module never serves the labels of the previous version from a browser cache.
const localesDir = path.resolve(__dirname, 'src/main/resources/javascript/locales');
const localeFiles = Object.fromEntries(fs.readdirSync(localesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => [file, crypto.createHash('md5').update(fs.readFileSync(path.join(localesDir, file))).digest('hex')]));

module.exports = (env, argv) => ({
    entry: {
        main: path.resolve(__dirname, 'src/javascript/index')
    },
    output: {
        path: path.resolve(__dirname, 'src/main/resources/javascript/apps/'),
        filename: 'jahia-oauth-oidc.bundle.js',
        chunkFilename: '[name].jahia-oauth-oidc.[chunkhash:6].js'
    },
    resolve: {
        mainFields: ['module', 'main'],
        extensions: ['.mjs', '.js', '.jsx', '.json']
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                type: 'javascript/auto'
            },
            {
                test: /\.jsx?$/,
                include: [path.join(__dirname, 'src/javascript')],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {modules: false, targets: {chrome: '90', edge: '90', firefox: '90', safari: '14'}}],
                            '@babel/preset-react'
                        ]
                    }
                }
            },
            {
                test: /\.css$/i,
                sideEffects: true,
                use: [
                    'style-loader',
                    {loader: 'css-loader', options: {modules: {localIdentName: 'oidc_[local]'}}}
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin({verbose: false}),
        new ModuleFederationPlugin(moduleFederationConfig),
        new DefinePlugin({OIDC_LOCALE_FILES: JSON.stringify(localeFiles)}),
        new CopyWebpackPlugin({patterns: [{from: 'package.json', to: ''}]})
    ],
    devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
    mode: 'development'
});
