import { execFile } from 'child_process';
import type { NetworkInterfaceInfo } from 'os';
import { networkInterfaces } from 'os';

import type { WifiPlugin } from '../../src/plugin/definitions';

const nodeWifi = require('node-wifi');

interface Network {
    ssid: string;
    bssid: string;
    mac: string; // equals to bssid (for retrocompatibility)
    channel: number;
    frequency: number; // in MHz
    signal_level: number; // in dB
    quality: number; // same as signal level but in %
    security: string; // format depending on locale for open networks in Windows
    security_flags: string; // encryption protocols (format currently depending of the OS)
    mode: string; // network mode like Infra (format currently depending of the OS)
}

export class Wifi implements WifiPlugin {
    constructor() {
        nodeWifi.init({
            iface: null, // network interface, choose a random wifi interface if set to null
        });
    }

    scan(): Promise<{ startScanSuccess: boolean; scanSuccess: boolean; scanResult: any }> {
        return new Promise((resolve, reject) => {
            nodeWifi.scan((error: Error, networks: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        startScanSuccess: true,
                        scanResult: networks,
                        scanSuccess: true,
                    });
                }
            });
        });
    }

    async getIP(): Promise<{ ip: string | null }> {
        const ifs: { [key: string]: NetworkInterfaceInfo[] } = networkInterfaces();
        const iface: NetworkInterfaceInfo = Object.keys(ifs)
            .map((key: string) => ifs[key].filter((x: NetworkInterfaceInfo) => x.family === 'IPv4' && !x.internal)[0])
            .filter((x) => x)[0];
        return { ip: iface ? iface.address : null };
    }

    async getSSID(): Promise<{ ssid: string | null }> {
        const currentConnections: Network[] = await nodeWifi.getCurrentConnections().catch(() => [] as Network[]);
        if (!currentConnections || currentConnections.length === 0) throw new Error('ERROR_NO_NETWORK_FOUND');
        return { ssid: currentConnections[0].ssid };
    }

    async connect(options: { ssid: string; password?: string }): Promise<{ ssid: string | null }> {
        await nodeWifi.connect(options);
        return this.checkConnection();
    }

    async connectPrefix(options: { ssid: string; password?: string }): Promise<{ ssid: string | null }> {
        let currentNetwork: { ssid: string | null };

        if (process.platform === 'win32') {
            currentNetwork = await this.getSSID().catch(() => ({ ssid: null }));
            await nodeWifi.disconnect().catch((err: Error) => {
                console.error('Unable to disconnect WiFi', err);
            });
            await this.timeout(2000);
        }

        const networks: Network[] = await nodeWifi.scan().catch((): any => []);
        if (process.platform === 'win32') {
            await this.reconnect(currentNetwork.ssid).catch();
        }
        const filteredNetworks: Network[] = networks.filter((val: Network) => val.ssid?.startsWith(options.ssid));
        if (filteredNetworks.length === 0) {
            throw new Error('ERROR_NO_NETWORK_FOUND');
        } else {
            const network: Network = await this.insertSelect(filteredNetworks);
            if (!network) {
                throw new Error('ERROR_NO_WIFI_SELECTED');
            } else {
                options.ssid = network.ssid;
                await nodeWifi.connect(options);
                return this.checkConnection();
            }
        }
    }

    async disconnect(): Promise<void> {
        await nodeWifi.disconnect();
    }

    private async checkConnection(retry = 10): Promise<{ ssid: string | null }> {
        let result: { ssid: string };
        let count = 0;
        while (!result && count < retry) {
            count++;
            result = await this.getSSID().catch(() => null);
            await this.timeout(1000);
        }
        if (!result) {
            throw new Error('ERROR_FAILED_TO_CONNECT');
        } else {
            return result;
        }
    }

    private timeout(millis: number): Promise<void> {
        return new Promise((resolve: () => void) => {
            setTimeout(() => {
                resolve();
            }, millis);
        });
    }

    private insertSelect(networks: Network[]): Promise<Network> {
        // Awaits to sequence the dialog animation and resolves from DOM event
        // handlers rather than inline; restructuring this Electron-only UI flow is
        // tracked separately.
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve: (network: Network) => void) => {
            // Build the dialog from DOM nodes instead of interpolating the (untrusted)
            // SSIDs into an HTML string to prevent DOM/XSS injection.
            const backdropEl: HTMLElement = document.createElement('div');
            backdropEl.id = 'wifiBackdrop';
            backdropEl.style.transition = 'opacity 0.2s ease-in-out';
            backdropEl.style.opacity = '0';
            backdropEl.style.height = '100vh';
            backdropEl.style.width = '100vw';
            backdropEl.style.backgroundColor = 'grey';
            document.body.appendChild(backdropEl);

            const dialogEL: HTMLDialogElement = document.createElement('dialog');
            dialogEL.id = 'wifiDialog';
            dialogEL.open = true;
            dialogEL.style.transition = 'opacity 0.2s ease-in-out';
            dialogEL.style.opacity = '0';
            dialogEL.style.zIndex = '2000';
            dialogEL.style.width = '300px';
            dialogEL.style.top = '50%';
            dialogEL.style.transform = 'translateY(-50%)';
            dialogEL.style.maxHeight = '80vh';
            dialogEL.style.overflowY = 'auto';
            dialogEL.style.boxShadow = '0px 10px 18px #888888';
            dialogEL.style.border = 'none';
            dialogEL.style.borderRadius = '5px';

            const form: HTMLFormElement = document.createElement('form');
            form.method = 'dialog';

            for (const network of networks) {
                const networkEl: HTMLButtonElement = document.createElement('button');
                networkEl.value = network.ssid;
                networkEl.textContent = network.ssid;
                networkEl.style.width = '100%';
                networkEl.style.padding = '5px';
                networkEl.style.fontSize = '15px';
                networkEl.style.marginBottom = '5px';
                networkEl.addEventListener('click', async () => {
                    backdropEl.style.opacity = '0';
                    dialogEL.style.opacity = '0';
                    await this.timeout(200);
                    backdropEl.remove();
                    dialogEL.remove();
                    resolve(network);
                });
                form.appendChild(networkEl);
            }
            dialogEL.appendChild(form);
            document.body.appendChild(dialogEL);

            await this.timeout(1);
            backdropEl.style.opacity = '0.5';
            dialogEL.style.opacity = '1';

            backdropEl.addEventListener('click', async () => {
                backdropEl.style.opacity = '0';
                dialogEL.style.opacity = '0';
                await this.timeout(200);
                backdropEl.remove();
                dialogEL.remove();
                resolve(null);
            });
        });
    }

    private async reconnect(ssid: string): Promise<void> {
        return new Promise((resolve: (res: any) => void, reject: (err: any) => void) => {
            // SSIDs are untrusted input (they come from scanned networks): reject
            // quotes and control characters to prevent argument injection into netsh.
            if (
                ssid === undefined ||
                ssid === null ||
                ssid.includes('"') ||
                Array.from(ssid).some((ch) => ch.charCodeAt(0) < 0x20)
            ) {
                reject(new Error('Invalid SSID'));
                return;
            }
            const env: any = {
                ...process.env,
                LANG: 'en_US.UTF-8',
                LC_ALL: 'en_US.UTF-8',
                LC_MESSAGES: 'en_US.UTF-8',
            };
            execFile(
                'netsh',
                ['wlan', 'connect', 'ssid="' + ssid + '"', 'name="' + ssid + '"'],
                { env },
                (err: any, stdout: any, stderr: any) => {
                    if (err) {
                        // Add command output to error, so it's easier to handle
                        err.stdout = stdout;
                        err.stderr = stderr;
                        reject(err);
                    } else {
                        resolve(stdout);
                    }
                },
            );
        });
    }
}
