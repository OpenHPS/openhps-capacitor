import { Module } from 'vuex';
import { RootState } from '../types';
import { Device } from '@capacitor/device';
import { 
    CallbackSinkNode, 
    DataFrame, 
    DataObject, 
    Model, 
    ModelBuilder, 
    WorkerNode 
} from '@openhps/core';
import { GeolocationSourceNode } from '@openhps/capacitor-geolocation';
import { BLESourceNode } from '@openhps/capacitor-bluetooth';
import { WLANSourceNode } from '@openhps/capacitor-wlan';
import { SensorSourceNode } from '@openhps/capacitor-sensors';

export interface PositioningSystemState {
    model: Model | undefined;
    phone: DataObject | undefined;
    callback: (frame: DataFrame | DataFrame[]) => void;
}

function logging(level: string, message: string, payload: Error): void {
    switch(level) {
        case 'debug':
            console.debug(message);
            break;
        case 'warn':
            console.warn(message);
            break;
        case 'error':
            console.error(message, payload);
            break;
        case 'info':
        default:
            console.info(message);
            break;
    } 
}

export const system: Module<PositioningSystemState, RootState> = {
    namespaced: true,
    state: {
        model: undefined,
        phone: undefined,
        callback: (_: any) => _,
    },
    getters: {
        /**
         * Check if the positioning system is ready
         *
         * @param {PositioningSystemState} state positioning system state
         * @returns {boolean} ready or not
         */
        isReady(state: PositioningSystemState): boolean {
            return state.model !== undefined && state.phone !== undefined;
        },
        /**
         * Get the positioning model that is created
         *
         * @param state 
         * @returns 
         */
        getPositioningModel(state: PositioningSystemState): Model | undefined {
            return state.model;
        },
        /**
         * Get the phone that is being tracked
         *
         * @param state 
         * @returns 
         */
        getPhone(state: PositioningSystemState): DataObject | undefined {
            return state.phone;
        }
    },
    actions: {
        /**
         * Set the callback method that will be invoked when the positioning model has an output.
         * This callback can be used to display the location to the user.
         * 
         * @param state 
         * @param callback 
         */
        setCallback({ state }, callback: (frame: DataFrame | DataFrame[]) => void): void {
            state.callback = callback;
        },
        requestPermission({ commit, state }): Promise<void> {
            return new Promise((resolve, reject) => {
                resolve();
            });
        },
        createPositioningModel({ commit, state }): Promise<Model> {
            return new Promise((resolve, reject) => {
                Promise.all([Device.getId(), Device.getInfo()]).then(([id, info]) => {
                    // Get the phone that this positioning system is deployed on
                    state.phone = new DataObject(id.uuid, info.name);
                    // Create the positioning system
                    return ModelBuilder.create()
                        .withLogger(logging)
                        .from(new GeolocationSourceNode({
                            autoStart: true,
                            source: state.phone
                        }), new BLESourceNode({
                            autoStart: true,
                        }), new WLANSourceNode({
                            autoStart: true,
                        }))
                        .via(
                            new WorkerNode('/js/worker.js',{
                                name: 'output',
                                directory: __dirname,
                                poolSize: 4,
                                type: 'module',
                                worker: '/js/vendor/openhps/worker.openhps-core.es.min.js'
                            })
                        )
                        .to(new CallbackSinkNode(frame => {
                            console.log(frame);
                            state.callback(frame);
                        }))
                        .build()
                }).then((model: Model) => {
                    commit('modelCreated', model);
                    model.on('error', error => {
                        commit('modelError', error);
                    });
                    resolve(model);
                }).catch(reject);
            });
        }
    },
    mutations: {
        modelCreated(state: PositioningSystemState, payload: Model) {
            state.model = payload;
        },
        modelError(state: PositioningSystemState, payload: Error) {
            console.error(payload);
        }
    },
};
