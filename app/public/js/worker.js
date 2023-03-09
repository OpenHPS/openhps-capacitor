import { ModelBuilder } from "./vendor/openhps/"

export default ModelBuilder.create()
    .from(new GeolocationSourceNode({
        autoStart: true
    }));