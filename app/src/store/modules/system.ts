import { Module } from 'vuex';
import { RootState } from '../types';
import { 
    CallbackSinkNode, 
    DataFrame, 
    Model, 
    ModelBuilder, 
    WorkerNode 
} from '@openhps/core';
import { GeolocationSourceNode } from '@openhps/web-geolocation';

export interface PositioningSystemState {
    model: Model | undefined;
    callback: (frame: DataFrame | DataFrame[]) => void;
}

export const system: Module<PositioningSystemState, RootState> = {
    namespaced: true,
    state: {
        model: undefined,
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
            return state.model !== undefined;
        },
        getPositioningModel(state: PositioningSystemState): Model | undefined {
            return state.model;
        },
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
                ModelBuilder.create()
                    .addNode(new WorkerNode('./system',{
                        name: 'output',
                        directory: __dirname,
                        poolSize: 4,
                        type: 'module',
                        worker: '/js/worker.openhps-core.min.js'
                    }))
                    .from('output')
                    .to(new CallbackSinkNode(state.callback))
                    .build().then((model: Model) => {
                        commit('modelCreated', model);
                        resolve(model);
                    }).catch(reject);
            });
        }
    },
    mutations: {
        modelCreated(state: PositioningSystemState, payload: Model) {
            state.model = payload;
        }
    },
};

/**
 * Default export will be used by the worker
 */
export default ModelBuilder.create()
    .from(new GeolocationSourceNode({
        autoStart: true
    }));
