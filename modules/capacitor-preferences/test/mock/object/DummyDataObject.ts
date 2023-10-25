import { DataObject, SerializableObject, SerializableMember } from '@openhps/core';

@SerializableObject()
export class DummyDataObject extends DataObject {
    @SerializableMember()
    public count: number = 0;
}
