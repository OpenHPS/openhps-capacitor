module.exports = {
    configureWebpack: {
        externals: {
            '@openhps/core': ['OpenHPS', 'core'],
            '@openhps/rf': ['OpenHPS', 'rf'],
        }
    }
}
