import {
    DataFrame,
    SourceNode,
    GeographicalPosition,
    SensorSourceOptions,
    LinearVelocity,
    Orientation,
    AngleUnit,
    Accuracy2D,
    LengthUnit,
    DataObject,
} from '@openhps/core';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';

/**
 * Geolocation source node using @capacitor/geolocation.
 */
export class GeolocationSourceNode extends SourceNode<DataFrame> {
    protected options: GeolocationSourceOptions;
    private _watchId: string;

    constructor(options?: SensorSourceOptions) {
        super(options);
        this.options.interval = this.options.interval || 1000;
        if (this.options.autoStart) {
            this.once('build', this.start.bind(this));
        }
        this.options.source = this.source ?? new DataObject();
    }

    static checkPermissions(): Promise<PermissionStatus> {
        return Geolocation.checkPermissions();
    }

    static requestPermissions(): Promise<PermissionStatus> {
        return Geolocation.requestPermissions({
            permissions: ['location'],
        });
    }

    start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Geolocation.watchPosition(
                {
                    maximumAge: this.options.interval,
                    timeout: this.options.timeout,
                    enableHighAccuracy: true,
                },
                (position) => {
                    const geoPos = this._convertPosition(position);
                    this.source.setPosition(geoPos);
                    this.push(new DataFrame(this.source));
                },
            )
                .then((value) => {
                    this._watchId = value;
                })
                .catch((error) => {
                    this.logger('error', 'Unable to watch for position changes!', error);
                    reject(error);
                });
            resolve();
        });
    }

    private _convertPosition(position: Position): GeographicalPosition {
        const geoPos = new GeographicalPosition();
        geoPos.accuracy = new Accuracy2D(position.coords.accuracy, position.coords.altitudeAccuracy, LengthUnit.METER);
        geoPos.altitude = position.coords.altitude;
        geoPos.latitude = position.coords.latitude;
        geoPos.longitude = position.coords.longitude;
        if (position.coords.speed) {
            geoPos.linearVelocity = new LinearVelocity(position.coords.speed);
        }
        if (position.coords.heading) {
            geoPos.orientation = Orientation.fromEuler({
                yaw: position.coords.heading,
                pitch: 0,
                roll: 0,
                unit: AngleUnit.DEGREE,
            });
        }
        return geoPos;
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve) => {
            Geolocation.clearWatch({
                id: this._watchId,
            });
            resolve();
        });
    }

    onPull(): Promise<DataFrame> {
        return new Promise<DataFrame>((resolve, reject) => {
            Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: this.options.timeout,
            })
                .then((position) => {
                    const geoPos = this._convertPosition(position);
                    this.source.setPosition(geoPos);
                    resolve(new DataFrame(this.source));
                })
                .catch(reject);
        });
    }
}

export interface GeolocationSourceOptions extends SensorSourceOptions {
    timeout?: number;
}
