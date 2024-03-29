import { DataFrame, SourceNode, SensorSourceOptions } from '@openhps/core';
import { BLEObject, BLEService, BLEUUID, MACAddress, RelativeRSSI } from '@openhps/rf';
import { BleClient, ScanMode, ScanResult } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

export { ScanMode };

/**
 * BLE source node using @capacitor-community/bluetooth-le
 */
export class BLESourceNode extends SourceNode<DataFrame> {
    protected options: BLESourceNodeOptions;
    protected scanning = false;

    constructor(options?: BLESourceNodeOptions) {
        super(options);
        this.options.uuids = this.options.uuids ?? undefined;
        this.once('build', this._onBleInit.bind(this));
        this.once('destroy', this.stop.bind(this));
        this.options.source = this.source ?? new BLEObject();
        this.options.scanMode = this.options.scanMode ?? ScanMode.SCAN_MODE_BALANCED;
        this.options.processRaw = this.options.processRaw === undefined ? true : this.options.processRaw;
    }

    static checkPermissions(): Promise<PermissionStatus> {
        return new Promise((resolve) => {
            resolve(undefined);
        });
    }

    static requestPermissions(): Promise<PermissionStatus> {
        return new Promise((resolve, reject) => {
            BleClient.initialize()
                .then(() => {
                    resolve({
                        name: 'bluetooth',
                        state: 'granted',
                    } as any);
                })
                .catch(reject);
        });
    }

    private _onBleInit(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const platform = Capacitor.getPlatform();
            BleClient.initialize()
                .then(() => {
                    if (platform !== 'android') {
                        return Promise.resolve();
                    } else {
                        this.logger('debug', `Enabling Bluetooth for platform ${platform}...`);
                        return BleClient.enable();
                    }
                })
                .then(() => {
                    this.logger('debug', 'BLE scanning enabled!');
                    if (this.options.autoStart && platform !== 'web') {
                        this.start().then(resolve).catch(reject);
                    } else {
                        resolve();
                    }
                })
                .catch(reject);
        });
    }

    isRunning(): boolean {
        return this.scanning;
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.logger('debug', 'Stopping BLE scan ...');
            this.scanning = false;
            BleClient.stopLEScan().then(resolve).catch(reject);
        });
    }

    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger('debug', 'Stopping BLE scan ...');
            BleClient.stopLEScan()
                .then(() => {
                    this.logger('debug', 'Starting BLE scan ...');
                    return BleClient.requestLEScan(
                        {
                            allowDuplicates: true,
                            scanMode: this.options.scanMode,
                            services: this.options.uuids,
                        },
                        (result: ScanResult) => {
                            this.process(result);
                        },
                    );
                })
                .then(() => {
                    this.scanning = true;
                    resolve();
                })
                .catch(reject);
        });
    }

    protected process(result: ScanResult) {
        const platform = Capacitor.getPlatform();
        try {
            const frame = new DataFrame();
            const uid = platform === 'android' ? MACAddress.fromString(result.device.deviceId) : result.device.deviceId;
            const beacon = new BLEObject(uid as any);
            beacon.displayName = result.device.name;
            if (result.rawAdvertisement && this.options.processRaw) {
                beacon.parseAdvertisement(new Uint8Array(result.rawAdvertisement.buffer));
            } else {
                if (result.manufacturerData) {
                    Object.keys(result.manufacturerData).forEach((manufacturer) => {
                        const data = result.manufacturerData[manufacturer];
                        beacon.parseManufacturerData(parseInt(manufacturer), new Uint8Array(data.buffer));
                    });
                }
                if (result.serviceData !== undefined) {
                    Object.keys(result.serviceData).map((serviceKey) => {
                        const data = result.serviceData[serviceKey];
                        const serviceUUID = BLEUUID.fromString(serviceKey);
                        if (!beacon.getServiceByUUID(serviceUUID)) {
                            beacon.addService(new BLEService(serviceUUID, new Uint8Array(data.buffer)));
                        }
                    });
                }
            }

            if (!beacon.txPower && result.txPower) {
                beacon.txPower = result.txPower;
            }

            frame.addObject(beacon);

            frame.source = this.source;
            frame.source.relativePositions.forEach((pos) =>
                frame.source.removeRelativePositions(pos.referenceObjectUID),
            );
            frame.source.addRelativePosition(new RelativeRSSI(beacon, result.rssi));
            this.push(frame);
        } catch (ex) {
            this.emit('error', ex);
        }
    }

    public onPull(): Promise<DataFrame> {
        return new Promise<DataFrame>((resolve) => {
            resolve(undefined);
        });
    }
}

export interface BLESourceNodeOptions extends SensorSourceOptions {
    /**
     * List of Service UUIDs that should be included in the result scan.
     */
    uuids?: string[];
    /**
     * Scanning mode
     */
    scanMode?: ScanMode;
    /**
     * Process raw advertisement data if available
     */
    processRaw?: boolean;
}
