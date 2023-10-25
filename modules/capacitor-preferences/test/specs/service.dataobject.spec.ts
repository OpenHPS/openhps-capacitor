import {
    LoggingSinkNode,
    CallbackSinkNode,
    Model,
    ModelBuilder,
    DataFrame,
    DataObjectService,
    DataObject,
    Absolute2DPosition,
    Absolute3DPosition,
    CallbackNode,
    CallbackSourceNode,
    KeyValueDataService,
} from '@openhps/core';
import { DummySensorObject } from '../mock/object/DummySensorObject';
import { expect } from 'chai';
import 'mocha';
import { CapacitorPreferencesDriver } from '../../src';

if (typeof localStorage === 'undefined' || localStorage === null) {
    // eslint-disable-next-line
    var LocalStorage = require('node-localstorage').LocalStorage;
    global.localStorage = new LocalStorage("");
    (global as any).window = { localStorage: global.localStorage };
}

describe('CapacitorPreferencesDriver', () => {

    describe('key value storage', () => {
        let keyValueService: KeyValueDataService;

        before(async () => {
            keyValueService = new KeyValueDataService("test", new CapacitorPreferencesDriver(String, {
                prefix: "test"
            }));
            await keyValueService.emitAsync('build');
        });

        it('should support saving string keys and values', async () => {
            await keyValueService.setValue("abc", "123");
            const value = await keyValueService.getValue("abc");
            expect(value).to.equal("123");
        });

        
        it('should not have a large overhead', async () => {
            await keyValueService.setValue("someKey:registered", JSON.stringify([
                "1", "2", "3"
            ]));
            await keyValueService.setValue("someKey:item:1", "Test1");
            await keyValueService.setValue("someKey:item:2", "Test2");
            await keyValueService.setValue("someKey:item:3", "Test3");
        });

    });

    describe('without compression', () => {
        let objectDataService: DataObjectService<DataObject>;

        before(async () => {
            objectDataService = new DataObjectService(new CapacitorPreferencesDriver(DataObject, {
                compress: true
            }));
            await objectDataService.deleteAll();
            const object1 = new DataObject();
            object1.setPosition(new Absolute2DPosition(5, 6));
            object1.displayName = 'Test';
            object1.createdTimestamp = Date.parse('10 Mar 1995 00:00:00 GMT');
    
            const object2 = new DataObject();
            object2.setPosition(new Absolute3DPosition(5, 6, 2));
            object2.displayName = 'Test';
            object2.parentUID = object1.uid;
            object2.createdTimestamp = Date.parse('10 Mar 1995 01:00:00 GMT');
    
            const object3 = new DataObject();
            object3.setPosition(new Absolute3DPosition(1, 1, 2));
            object3.displayName = 'Maxim';
            object3.createdTimestamp = Date.parse('10 Mar 1995 02:00:00 GMT');
    
            await objectDataService.insert(object1.uid, object1);
            await objectDataService.insert(object2.uid, object2);
            await objectDataService.insert(object3.uid, object3);
        });
        
        it('should support sorting in descending order', (done) => {
            objectDataService
                .findAll({}, {
                    sort: [['createdTimestamp', -1]]
                })
                .then((objects) => {
                    expect(objects.length).to.equal(3);
                    expect(objects[0].createdTimestamp).to.equal(794800800000);
                    expect(objects[objects.length - 1].createdTimestamp).to.equal(794793600000);
                    done();
                })
                .catch((ex) => {
                    done(ex);
            });
        });
    
        it('should support sorting in ascending order', (done) => {
            objectDataService
                .findAll({}, {
                    sort: [['createdTimestamp', 1]]
                })
                .then((objects) => {
                    expect(objects.length).to.equal(3);
                    expect(objects[0].createdTimestamp).to.equal(794793600000);
                    expect(objects[objects.length - 1].createdTimestamp).to.equal(794800800000);
                    done();
                })
                .catch((ex) => {
                    done(ex);
            });
        });

        it('should support sorting strings in ascending order', (done) => {
            objectDataService
                .findAll({}, {
                    sort: [['displayName', 1]]
                })
                .then((objects) => {
                    expect(objects.length).to.equal(3);
                    expect(objects[0].createdTimestamp).to.equal(794800800000);
                    expect(objects[objects.length - 1].createdTimestamp).to.equal(794797200000);
                    done();
                })
                .catch((ex) => {
                    done(ex);
            });
        });
    
        it('should find data objects before a certain date', (done) => {
            objectDataService
                .findBefore(Date.parse('10 Mar 1995 01:30:00 GMT'))
                .then((objects) => {
                    expect(objects.length).to.equal(2);
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should find data objects after a certain date', (done) => {
            objectDataService
                .findAfter(Date.parse('10 Mar 1995 01:30:00 GMT'))
                .then((objects) => {
                    expect(objects.length).to.equal(1);
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should find a object by 2d position', (done) => {
            objectDataService
                .findByPosition(new Absolute2DPosition(5, 6))
                .then((objects) => {
                    expect(objects[0].getPosition()).to.be.instanceOf(Absolute2DPosition);
                    const location = objects[0].getPosition() as Absolute2DPosition;
                    expect(location.x).to.equal(5);
                    expect(location.y).to.equal(6);
                    expect(objects[0].displayName).to.equal('Test');
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should find a object by 3d position', (done) => {
            objectDataService
                .findByPosition(new Absolute3DPosition(5, 6, 2))
                .then((objects) => {
                    expect(objects[0].getPosition()).to.be.instanceOf(Absolute3DPosition);
                    const location = objects[0].getPosition() as Absolute3DPosition;
                    expect(location.x).to.equal(5);
                    expect(location.y).to.equal(6);
                    expect(location.z).to.equal(2);
                    expect(objects[0].displayName).to.equal('Test');
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should store objects', (done) => {
            const object = new DataObject('2');
            object.displayName = 'Test';
            objectDataService.insert(object.uid, object).then((savedObject) => {
                expect(savedObject.uid).to.equal('2');
                expect(savedObject.displayName).to.equal('Test');
                objectDataService.findByUID('2').then((savedObject) => {
                    expect(savedObject.uid).to.equal('2');
                    expect(savedObject.displayName).to.equal('Test');
                    done();
                });
            });
        });
    
        it('should throw an error when quering non existing objects', (done) => {
            objectDataService
                .findByUID('test')
                .then((savedObject) => {
                    done('It did not throw an error');
                })
                .catch((ex) => {
                    done();
                });
        });
    
        it('should find all items', () => {
            objectDataService.findAll().then((objects) => {
                expect(objects.length).to.be.gte(1);
            });
        });
    
        it('should find by display name', () => {
            objectDataService.findByDisplayName('Test').then((objects) => {
                expect(objects.length).to.equal(3);
            });
        });
    });

    describe('with compression', () => {
        let objectDataService: DataObjectService<DataObject>;

        before(async () => {
            objectDataService = new DataObjectService(new CapacitorPreferencesDriver(DataObject, {
                compress: true
            }));
            await objectDataService.deleteAll();
            const object1 = new DataObject();
            object1.setPosition(new Absolute2DPosition(5, 6));
            object1.displayName = 'Test';
            object1.createdTimestamp = Date.parse('10 Mar 1995 00:00:00 GMT');
    
            const object2 = new DataObject();
            object2.setPosition(new Absolute3DPosition(5, 6, 2));
            object2.displayName = 'Test';
            object2.parentUID = object1.uid;
            object2.createdTimestamp = Date.parse('10 Mar 1995 01:00:00 GMT');
    
            const object3 = new DataObject();
            object3.setPosition(new Absolute3DPosition(1, 1, 2));
            object3.displayName = 'Maxim';
            object3.createdTimestamp = Date.parse('10 Mar 1995 02:00:00 GMT');
    
            await objectDataService.insert(object1.uid, object1);
            await objectDataService.insert(object2.uid, object2);
            await objectDataService.insert(object3.uid, object3);
        });
    
        it('should support sorting in descending order', (done) => {
            objectDataService
                .findAll({}, {
                    sort: [['createdTimestamp', -1]]
                })
                .then((objects) => {
                    expect(objects.length).to.equal(3);
                    expect(objects[0].createdTimestamp).to.equal(794800800000);
                    expect(objects[objects.length - 1].createdTimestamp).to.equal(794793600000);
                    done();
                })
                .catch((ex) => {
                    done(ex);
            });
        });
    
        it('should support sorting in ascending order', (done) => {
            objectDataService
                .findAll({}, {
                    sort: [['createdTimestamp', 1]]
                })
                .then((objects) => {
                    expect(objects.length).to.equal(3);
                    expect(objects[0].createdTimestamp).to.equal(794793600000);
                    expect(objects[objects.length - 1].createdTimestamp).to.equal(794800800000);
                    done();
                })
                .catch((ex) => {
                    done(ex);
            });
        });
    
        it('should find data objects before a certain date', (done) => {
            objectDataService
                .findBefore(Date.parse('10 Mar 1995 01:30:00 GMT'))
                .then((objects) => {
                    expect(objects.length).to.equal(2);
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should find data objects after a certain date', (done) => {
            objectDataService
                .findAfter(Date.parse('10 Mar 1995 01:30:00 GMT'))
                .then((objects) => {
                    expect(objects.length).to.equal(1);
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should find a object by 2d position', (done) => {
            objectDataService
                .findByPosition(new Absolute2DPosition(5, 6))
                .then((objects) => {
                    expect(objects[0].getPosition()).to.be.instanceOf(Absolute2DPosition);
                    const location = objects[0].getPosition() as Absolute2DPosition;
                    expect(location.x).to.equal(5);
                    expect(location.y).to.equal(6);
                    expect(objects[0].displayName).to.equal('Test');
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should find a object by 3d position', (done) => {
            objectDataService
                .findByPosition(new Absolute3DPosition(5, 6, 2))
                .then((objects) => {
                    expect(objects[0].getPosition()).to.be.instanceOf(Absolute3DPosition);
                    const location = objects[0].getPosition() as Absolute3DPosition;
                    expect(location.x).to.equal(5);
                    expect(location.y).to.equal(6);
                    expect(location.z).to.equal(2);
                    expect(objects[0].displayName).to.equal('Test');
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    
        it('should store objects', (done) => {
            const object = new DataObject('2');
            object.displayName = 'Test';
            objectDataService.insert(object.uid, object).then((savedObject) => {
                expect(savedObject.uid).to.equal('2');
                expect(savedObject.displayName).to.equal('Test');
                objectDataService.findByUID('2').then((savedObject) => {
                    expect(savedObject.uid).to.equal('2');
                    expect(savedObject.displayName).to.equal('Test');
                    done();
                });
            });
        });
    
        it('should throw an error when quering non existing objects', (done) => {
            objectDataService
                .findByUID('test')
                .then((savedObject) => {
                    done('It did not throw an error');
                })
                .catch((ex) => {
                    done();
                });
        });
    
        it('should find all items', () => {
            objectDataService.findAll().then((objects) => {
                expect(objects.length).to.be.gte(1);
            });
        });
    
        it('should find by display name', () => {
            objectDataService.findByDisplayName('Test').then((objects) => {
                expect(objects.length).to.equal(3);
            });
        });
    });

    describe('source node', () => {
        let model: Model<DataFrame, DataFrame>;
        let objectDataService: DataObjectService<DataObject>;

        before((done) => {
            ModelBuilder.create()
                .addService(new DataObjectService(new CapacitorPreferencesDriver(DataObject)))
                .from(new CallbackSourceNode())
                .to(new LoggingSinkNode())
                .build()
                .then((m) => {
                    model = m;
                    objectDataService = model.findDataService(DataObject);

                    const object = new DummySensorObject('123');
                    object.setPosition(new Absolute2DPosition(3, 2));
                    object.displayName = 'Hello';
                    objectDataService.insert(object.uid, object).then((savedObject) => {
                        done();
                    });
                });
        });

        it('should load unknown objects', (done) => {
            const object = new DummySensorObject('123');
            const frame = new DataFrame();
            frame.addObject(object);
            model
                .push(frame)
                .then((_) => {
                    // Check if it is stored
                    objectDataService
                        .findAll()
                        .then((objects) => {
                            expect(objects[0].displayName).to.equal('Hello');
                            done();
                        })
                        .catch((ex) => {
                            done(ex);
                        });
                })
                .catch((ex) => {
                    done(ex);
                });
        });

        it('should emit events', (done) => {
            objectDataService.once('deleteAll', () => {
                done();
            });
            Promise.resolve(objectDataService.deleteAll());
        });

        it('should delete all objects based on a query', (done) => {
            const promises = [];
            const object = new DummySensorObject('x');
            object.setPosition(new Absolute2DPosition(5, 3));
            object.displayName = 'X';
            promises.push(objectDataService.insert(object.uid, object));
            for (let i = 0 ; i <= 10 ; i++){
                const object = new DummySensorObject('123' + i);
                object.setPosition(new Absolute2DPosition(5, i));
                object.displayName = 'Beat';
                promises.push(objectDataService.insert(object.uid, object));
            }
            Promise.all(promises).then(() => {
                objectDataService.count({
                    displayName: "Beat"
                }).then(count1 => {
                    expect(count1, "Stored objects count is 0").to.not.eq(0);
                    objectDataService.deleteAll({
                        displayName: "Beat"
                    }).then(() => {
                        return objectDataService.count({
                            displayName: "Beat"
                        });
                    }).then(count2 => {
                        expect(count2).to.eq(0);
                        return objectDataService.count();
                    }).then(count => {
                        expect(count).to.not.eq(0);
                        done();
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        });

        it('should delete all objects', (done) => {
            objectDataService.deleteAll().then(() => {
                done();
            });
        });
    });

    describe('sink node', () => {
        let model: Model<DataFrame, DataFrame>;
        let objectDataService: DataObjectService<DataObject>;

        before((done) => {
            ModelBuilder.create()
                .addService(new DataObjectService(new CapacitorPreferencesDriver(DataObject, {
                    namespace: "sink"
                })))
                .from()
                .store()
                .build()
                .then((m) => {
                    model = m;
                    objectDataService = model.findDataService(DataObject);
                    return objectDataService.deleteAll();
                }).then(() => {
                    done();
                });
        });

        it('should store objects at the sink node', (done) => {
            const object = new DataObject();
            object.setPosition(new Absolute2DPosition(1, 2));
            object.displayName = 'Test';
            const frame = new DataFrame();
            frame.addObject(object);
            model
                .push(frame)
                .then((_) => {
                    setTimeout(() => {
                        // Check if it is stored
                        objectDataService
                            .findAll()
                            .then((objects) => {
                                expect(objects.length).to.be.greaterThan(0);
                                expect(objects[0].displayName).to.equal('Test');
                                expect(objects[0].getPosition()).to.be.instanceOf(Absolute2DPosition);
                                expect((objects[0].getPosition() as Absolute2DPosition).y).to.equal(2);
                                done();
                            })
                            .catch((ex) => {
                                done(ex);
                            });
                    }, 100);
                })
                .catch((ex) => {
                    done(ex);
                });
        });

        it('should store unknown data objects at the sink node', (done) => {
            const object = new DummySensorObject();
            object.displayName = 'Testabc';
            const frame = new DataFrame();
            frame.addObject(object);
            model
                .push(frame)
                .then((_) => {
                    setTimeout(() => {
                        // Check if it is stored
                        objectDataService
                            .findAll()
                            .then((objects) => {
                                expect(objects.length).to.be.greaterThan(0);
                                expect(objects[1].displayName).to.equal('Testabc');
                                done();
                            })
                            .catch((ex) => {
                                done(ex);
                            });
                    }, 100);
                })
                .catch((ex) => {
                    done(ex);
                });
        });

        it('should resolve the promise after stored', async () => {
            const object = new DataObject();
            object.setPosition(new Absolute2DPosition(1, 2));
            object.displayName = 'Test';
            const frame = new DataFrame();
            frame.addObject(object);
            const model: Model = await ModelBuilder.create()
                .from()
                .via(new CallbackNode())
                .to(new CallbackSinkNode())
                .build();
            await model.push(frame);
            const result = await model.findDataService(DataObject).findByUID(object.uid);
            expect(result.displayName).to.equal('Test');
        });
    });

    
    describe('sink node without persistence', () => {
        let model: Model<DataFrame, DataFrame>;
        let objectDataService: DataObjectService<DataObject>;

        before((done) => {
            ModelBuilder.create()
                .from()
                .to(new CallbackSinkNode(() => {}, {
                    persistence: false
                }))
                .build()
                .then((m) => {
                    model = m;
                    objectDataService = model.findDataService(DataObject);
                    return objectDataService.deleteAll();
                }).then(() => {
                    done();
                });
        });

        it('should not store objects at the sink node', (done) => {
            const object = new DataObject();
            object.setPosition(new Absolute2DPosition(1, 2));
            object.displayName = 'Test';
            const frame = new DataFrame();
            frame.addObject(object);
            model
                .push(frame)
                .then(() => {
                    // Check if it is stored
                    objectDataService
                        .findAll()
                        .then((objects) => {
                            expect(objects.length).to.equal(0);
                            done();
                        })
                        .catch((ex) => {
                            done(ex);
                        });
                })
                .catch((ex) => {
                    done(ex);
                });
        });
    });
});
