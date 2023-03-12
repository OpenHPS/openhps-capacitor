import { DataFrame, SourceNode, SensorSourceOptions, DataObject } from '@openhps/core';
import { WLANObject, RelativeRSSI } from '@openhps/rf';
import { wifi } from "capacitor-jd-wifi";

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

        this.once('build', this._onWifiInit.bind(this));
        this.once('destroy', this.stop.bind(this));

        this.options.source = this.source ?? new WLANObject();
    }

    private _onWifiInit(): Promise<void> {
        return new Promise((resolve, reject) => {
            document.addEventListener(
                'deviceready',
                function () {
                    this.logger("debug", "Initializing Wi-Fi scanning ...");
                    if (this.options.autoStart) {
                        return this.start();
                    } else {
                        return resolve();
                    }
                },
                false,
            );
        });
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
        wifi.scan()
            .then((result: {
                startScanSuccess: boolean;
                scanSuccess: boolean;
                scanResult: any;
            }) => {
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
        console.log(wifiList)
        const frame = new DataFrame();
        frame.source = this.source ?? new DataObject("source");
        frame.source.relativePositions.forEach((pos) => frame.source.removeRelativePositions(pos.referenceObjectUID));
        wifiList.forEach((value) => {
            const ap = new WLANObject(value.BSSID);
            ap.displayName = value.SSID;
            ap.frequency = value.frequency;
            ap.capabilities = value.capabilities;
            frame.addObject(ap);
            frame.source.addRelativePosition(new RelativeRSSI(ap, value.level));
        });
        return frame;
    }

    public onPull(): Promise<DataFrame> {
        return new Promise<DataFrame>((resolve, reject) => {
            wifi.scan()
                .then((result: {
                    startScanSuccess: boolean;
                    scanSuccess: boolean;
                    scanResult: any;
                }) => {
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