const path = require('path');

module.exports = {
    configureWebpack: {
        resolve: {
            alias: {
               "@openhps/core": path.join(require.resolve("@openhps/core"), "../../", "web", "openhps-core.min.js")
            }
        }
    }
}
