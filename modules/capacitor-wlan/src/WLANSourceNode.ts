import { DataFrame, SourceNode, SensorSourceOptions, DataObject } from '@openhps/core';
import { WLANObject, RelativeRSSI } from '@openhps/rf';
import { Wifi } from './plugin/index';

/**
 * WLAN source node
 */
export class WLANSourceNode extends SourceNode<DataFrame> {
    protected options: SensorSourceOptions;
    private _timer: number;
    private _running = false;

    constructor(options?: SensorSourceOptions) {
        super(options);
        this.options.interval = this.options.interval || 0;
        this.options.source = this.source ?? new WLANObject();

        if (this.options.autoStart) {
            this.once('build', this.start.bind(this));
        }
        this.once('destroy', this.stop.bind(this));
    }

    start(): Promise<void> {
        return new Promise<void>((resolve) => {
            // Scan interval
            this._running = true;
            this._timer = setTimeout(this._scan.bind(this), this.options.interval) as any;
            resolve();
        });
    }

    private _scan(): void {
        if (!this._running) {
            return;
        }

        // Keep scan id as timer identifier
        const scanId = this._timer;
        // Load wifi list
        Wifi.scan()
            .then((result: { startScanSuccess: boolean; scanSuccess: boolean; scanResult: any }) => {
                if (!result.startScanSuccess || !result.scanSuccess) {
                    this.logger('error', 'Wi-Fi scan did not succeed!');
                    return;
                }
                return this.push(this.parseList(result.scanResult));
            })
            .catch((ex: Error) => {
                this.logger('error', 'Unable to perform Wi-Fi scan!', ex);
            })
            .finally(() => {
                if (!this._running || this._timer !== scanId) {
                    return;
                }
                this._timer = setTimeout(this._scan.bind(this), this.options.interval) as any;
            });
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve) => {
            this._running = false;
            clearTimeout(this._timer);
            this._timer = undefined;
            resolve();
        });
    }

    public parseList(wifiList: Array<any>): DataFrame {
        const frame = new DataFrame();
        frame.source = this.source ?? new DataObject('source');
        frame.source.relativePositions.forEach((pos) => frame.source.removeRelativePositions(pos.referenceObjectUID));
        wifiList.forEach((value) => {
            const ap = new WLANObject(value.bssid);
            ap.displayName = value.ssid;
            ap.frequency = value.frequency;
            ap.capabilities = value.capabilities;
            frame.addObject(ap);
            frame.source.addRelativePosition(new RelativeRSSI(ap, value.signal_level));
        });
        return frame;
    }

    public onPull(): Promise<DataFrame> {
        return new Promise<DataFrame>((resolve, reject) => {
            Wifi.scan()
                .then((result: { startScanSuccess: boolean; scanSuccess: boolean; scanResult: any }) => {
                    if (!result.startScanSuccess || !result.scanSuccess) {
                        this.logger('error', 'Wi-Fi scan did not succeed!');
                        return;
                    }
                    resolve(this.parseList(result.scanResult));
                })
                .catch(reject);
        });
    }
}
