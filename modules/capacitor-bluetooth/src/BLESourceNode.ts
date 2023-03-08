import { DataFrame, SourceNode, SensorSourceOptions } from '@openhps/core';
import { BLEObject, MACAddress, RelativeRSSI } from '@openhps/rf';
import { BleClient, ScanMode, ScanResult } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

/**
 * BLE source node using cordova-plugin-ibeacon.
 */
export class BLESourceNode extends SourceNode<DataFrame> {
    protected options: BLESourceNodeOptions;

    constructor(options?: BLESourceNodeOptions) {
        super(options);
        this.options.uuids = this.options.uuids || undefined;
        this.once('build', this._onBleInit.bind(this));
        this.once('destroy', this.stop.bind(this));
    }

    private _onBleInit(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const platform = Capacitor.getPlatform();
            BleClient.initialize().then(() => {
                if (platform === "web" || platform === "electron") {
                    return Promise.resolve();
                } else {
                    this.logger('debug', `Enabling Bluetooth for platform ${platform}...`);
                    return BleClient.enable();
                }
            }).then(() => {
                this.logger('debug', 'BLE scanning enabled!');
                if (this.options.autoStart && platform !== "web") {
                    this.start().then(resolve).catch(reject);
                } else {
                    resolve();
                }
            }).catch(reject);
        });
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.logger('debug', 'Stopping BLE scan ...');
            BleClient.stopLEScan();
            resolve();
        });
    }

    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger('debug', 'Stopping BLE scan ...');
            BleClient.stopLEScan().then(() => {
                this.logger('debug', 'Starting BLE scan ...');
                BleClient.requestLEScan({
                    allowDuplicates: true,
                    scanMode: ScanMode.SCAN_MODE_LOW_LATENCY,
                    services: this.options.uuids,
                }, (result: ScanResult) => {
                    alert(result)
                    const frame = new DataFrame();
                    const beacon = new BLEObject(MACAddress.fromString(result.device.deviceId));
                    beacon.displayName = result.device.name;
                    beacon.parseManufacturerData(Buffer.from(Object.values(result.manufacturerData)[0].buffer));
                    frame.addObject(beacon);
    
                    frame.source = this.source;
                    frame.source.relativePositions.forEach((pos) =>
                        frame.source.removeRelativePositions(pos.referenceObjectUID),
                    );
                    frame.source.addRelativePosition(new RelativeRSSI(beacon, result.rssi));
                    this.push(frame);
                })
            }).then(resolve).catch(reject);
        });
    }

    public onPull(): Promise<DataFrame> {
        return new Promise<DataFrame>((resolve) => {
            resolve(undefined);
        });
    }
}

export interface BLESourceNodeOptions extends SensorSourceOptions {
    /**
     * List of UUIDs that should be included in the result scan.
     */
    uuids?: string[];
}
