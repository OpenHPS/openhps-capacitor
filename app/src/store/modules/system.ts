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

export interface PositioningSystemState {
    model: Model | undefined;
    phone: DataObject | undefined;
    callback: (frame: DataFrame | DataFrame[]) => void;
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
        getPositioningModel(state: PositioningSystemState): Model | undefined {
            return state.model;
        },
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
        createPositioningModel({ commit, state }): Promise<Model> {
            return new Promise((resolve, reject) => {
                Promise.all([Device.getId(), Device.getInfo()]).then(([id, info]) => {
                    // Get the phone that this positioning system is deployed on
                    state.phone = new DataObject(id.uuid, info.name);
                    return ModelBuilder.create()
                        .from(new GeolocationSourceNode({
                            autoStart: true,
                            source: state.phone
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
