import { DataObject, SerializableObject, AngleUnit } from '@openhps/core';

@SerializableObject()
export class DummySensorObject extends DataObject {
    public horizontalFOV: number;
    public verticalFOV: number;
    public fovUnit: AngleUnit;
}
