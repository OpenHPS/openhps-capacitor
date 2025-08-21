import {
    DataServiceDriver,
    FilterQuery,
    MemoryQueryEvaluator,
    FindOptions,
    DataSerializerUtils,
    DataServiceOptions,
} from '@openhps/core';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { Preferences } from '@capacitor/preferences';

export class CapacitorPreferencesDriver<I, T> extends DataServiceDriver<I, T> {
    protected options: CapacitorPreferencesOptions;
    protected _indexKeys: string[] = [];
    protected prefix: string;
    protected lockIndex: number = 0;
    protected exclusiveLock: number = undefined;
    protected sharedLocks: Set<number> = new Set();

    constructor(dataType?: new () => T, options?: CapacitorPreferencesOptions) {
        super(dataType as unknown as new () => T, options);
        this.options.namespace = this.options.namespace || 'default';
        this.options.chunkSize = this.options.chunkSize || 10;
        this.prefix = `${this.options.namespace}.${this.options.prefix || dataType.name}`.toLowerCase();

        this.once('build', this._initialize.bind(this));
    }

    private _initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const metaData = DataSerializerUtils.getRootMetadata(this.dataType);
            if (!metaData) {
                return resolve();
            }
            const indexes: Array<Promise<void>> = Array.from(metaData.dataMembers.values())
                .filter((dataMember: any) => dataMember.index)
                .map(this.createIndex.bind(this));
            Promise.all(indexes)
                .then(() => resolve())
                .catch(reject);
        });
    }

    public createIndex(dataMember: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (dataMember.index) {
                Preferences.set({
                    key: `${this.prefix}_index_${dataMember.key}`,
                    value: JSON.stringify([]),
                })
                    .then(resolve)
                    .catch(reject);
            } else {
                resolve();
            }
        });
    }

    count(filter?: FilterQuery<T>): Promise<number> {
        return new Promise((resolve) => {
            this._findAll(false).then(async (items) => {
                if (filter) {
                    let count = 0;
                    for (let i = 0; i <= items.length; i += this.options.chunkSize) {
                        const keys = items.slice(i, i + this.options.chunkSize);
                        for (const key of keys) {
                            const value = await this._findByUID(key);
                            if (MemoryQueryEvaluator.evaluate(value, filter)) {
                                count++;
                            }
                        }
                    }
                    resolve(count);
                } else {
                    resolve(items.length);
                }
            });
        });
    }

    private _findAll(write: boolean): Promise<I[]> {
        return new Promise((resolve, reject) => {
            this._lockIndex(write)
                .then((id) => {
                    return Promise.all([
                        id,
                        Preferences.get({
                            key: `${this.prefix}_keys`,
                        }),
                    ]);
                })
                .then(([id, result]) => {
                    if (!write) {
                        this._unlockIndex(id);
                    }

                    if (result.value === null) {
                        return resolve([]);
                    }
                    resolve(JSON.parse(result.value) || []);
                })
                .catch(reject);
        });
    }

    private _unlockIndex(id?: number): void {
        if (this.sharedLocks.has(id)) {
            this.sharedLocks.delete(id);
        } else {
            this.exclusiveLock = undefined;
        }
    }

    private _lockIndex(exclusive: boolean): Promise<number> {
        return new Promise((resolve) => {
            const id = this.lockIndex++;
            if (this.exclusiveLock !== undefined || (this.sharedLocks.size > 0 && exclusive)) {
                const interval = setInterval(() => {
                    if (
                        (exclusive && this.exclusiveLock === undefined && this.sharedLocks.size === 0) ||
                        (!exclusive && this.exclusiveLock === undefined)
                    ) {
                        if (!exclusive) {
                            this.sharedLocks.add(id);
                        } else {
                            this.exclusiveLock = id;
                        }
                        clearInterval(interval);
                        resolve(id);
                    }
                }, 10);
            } else if (exclusive) {
                this.exclusiveLock = id;
                resolve(id);
            } else {
                this.sharedLocks.add(id);
                resolve(id);
            }
        });
    }

    private _findByUID(id: I): Promise<any> {
        return new Promise((resolve, reject) => {
            Preferences.get({
                key: `${this.prefix}.${id}`,
            })
                .then((result) => {
                    if (result.value === null) {
                        return resolve(undefined);
                    }
                    const jsonStr = this.options.compress ? decompressFromUTF16(result.value) : result.value;
                    try {
                        resolve(JSON.parse(jsonStr));
                    } catch {
                        resolve(undefined);
                    }
                })
                .catch(reject);
        });
    }

    findByUID(id: I): Promise<T> {
        return new Promise((resolve, reject) => {
            this._findByUID(id)
                .then((serialized) => {
                    if (serialized) {
                        const obj = this.options.deserialize(serialized);
                        resolve(obj);
                    } else {
                        reject(`${this.dataType.name} with identifier #${id} not found!`);
                    }
                })
                .catch(reject);
        });
    }

    findOne(query?: FilterQuery<T>, options: FindOptions = {}): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.findAll(query, {
                limit: 1,
                sort: options.sort,
            })
                .then((results) => {
                    if (results.length > 0) {
                        return resolve(results[0]);
                    } else {
                        resolve(undefined);
                    }
                })
                .catch(reject);
        });
    }

    findAll(query?: FilterQuery<T>, options: FindOptions = {}): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            this._findAll(false)
                .then(async (items) => {
                    options.limit = options.limit || items.length;
                    let data: T[] = [];
                    for (let i = 0; i <= items.length; i += this.options.chunkSize) {
                        const keys = items.slice(i, i + this.options.chunkSize);
                        for (const key of keys) {
                            const value = await this._findByUID(key);
                            if (value && MemoryQueryEvaluator.evaluate(value, query)) {
                                data.push(value);
                                if (!options.sort && data.length >= options.limit) {
                                    break;
                                }
                            }
                        }
                    }
                    if (options.sort) {
                        data = data
                            .sort((a, b) =>
                                options.sort
                                    .map((s: any) => {
                                        const res1 = MemoryQueryEvaluator.getValueFromPath(s[1] > 0 ? a : b, s[0])[1];
                                        const res2 = MemoryQueryEvaluator.getValueFromPath(s[1] > 0 ? b : a, s[0])[1];
                                        if (typeof res1 === 'number') {
                                            return res1 - res2;
                                        } else if (typeof res1 === 'string') {
                                            return res1.localeCompare(res2);
                                        } else {
                                            return 0;
                                        }
                                    })
                                    .reduce((a: number, b: number) => a + b),
                            )
                            .slice(0, options.limit);
                    }
                    data = data.map(this.options.deserialize);
                    resolve(data);
                })
                .catch(reject);
        });
    }

    insert(id: I, object: T): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const serializedStr = JSON.stringify(this.options.serialize(object));
            const compressedStr = this.options.compress ? compressToUTF16(serializedStr) : serializedStr;
            Preferences.set({
                key: `${this.prefix}.${id}`,
                value: compressedStr,
            })
                .then(() => {
                    return this._findAll(true);
                })
                .then((items) => {
                    if (!items.includes(id)) {
                        items.push(id);
                        return Preferences.set({
                            key: `${this.prefix}_keys`,
                            value: JSON.stringify(items),
                        });
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(() => {
                    resolve(object);
                })
                .finally(() => {
                    this._unlockIndex();
                })
                .catch(reject);
        });
    }

    delete(id: I): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._findAll(true)
                .then((items) => {
                    items.splice(items.indexOf(id), 1);
                    return Preferences.set({
                        key: `${this.prefix}_keys`,
                        value: JSON.stringify(items),
                    });
                })
                .then(() => {
                    return Preferences.remove({
                        key: `${this.prefix}.${id}`,
                    });
                })
                .then(() => {
                    resolve();
                })
                .finally(() => {
                    this._unlockIndex();
                })
                .catch(reject);
        });
    }

    deleteAll(filter?: FilterQuery<T>): Promise<void> {
        return new Promise((resolve, reject) => {
            this._findAll(false)
                .then(async (items) => {
                    if (!filter) {
                        Promise.all(items.map((item) => this.delete(item)))
                            .then(() => resolve())
                            .catch(reject);
                    } else {
                        this._findAll(false)
                            .then(async (items) => {
                                for (let i = 0; i <= items.length; i += this.options.chunkSize) {
                                    const keys = items.slice(i, i + this.options.chunkSize);
                                    for (const key of keys) {
                                        const value = await this._findByUID(key);
                                        if (MemoryQueryEvaluator.evaluate(value, filter)) {
                                            await this.delete(key);
                                        }
                                    }
                                }
                                resolve();
                            })
                            .catch(reject);
                    }
                })
                .catch(reject);
        });
    }
}

export interface CapacitorPreferencesOptions extends DataServiceOptions {
    /**
     * Namespace
     * @default default
     */
    namespace?: string;
    /**
     * Chunk size for querying
     * @default 10
     */
    chunkSize?: number;
    /**
     * Compress data using LZ-based compression
     * @default false
     */
    compress?: boolean;
    /**
     * Prefix to use
     * @default dataType.constructor.name
     */
    prefix?: string;
}
