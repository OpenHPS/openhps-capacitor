const path = require('path');

module.exports = {
    configureWebpack: {
        resolve: {
            alias: {
               "@openhps/core": path.join("public/js/vendor", "openhps", "openhps-core.es.min.js")
            }
        }
    }
}
