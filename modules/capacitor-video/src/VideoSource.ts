import { SourceNode, SourceNodeOptions } from '@openhps/core';
import { CameraObject, VideoFrame } from '@openhps/video';
import { Camera, PermissionStatus } from '@capacitor/camera';

/**
 * Video source node using @capacitor/camera
 */
export class VideoSource extends SourceNode<VideoFrame> {
    protected options: VideoSourceOptions;

    constructor(options?: VideoSourceOptions) {
        super(options);
        this.once('build', this.start.bind(this));
        this.once('destroy', this.stop.bind(this));
        this.options.source = this.source ?? new CameraObject();
    }

    static checkPermissions(): Promise<PermissionStatus> {
        return Camera.checkPermissions();
    }

    static requestPermissions(): Promise<PermissionStatus> {
        return Camera.requestPermissions({
            permissions: ['camera']
        });
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve) => {
          
            resolve();
        });
    }

    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            
        });
    }

    public onPull(): Promise<VideoFrame> {
        return new Promise((resolve) => {
            resolve(undefined);
        });
    }
}

export interface VideoSourceOptions extends SourceNodeOptions {
    /**
     * Autoplay the video when building the node
     */
    autoPlay?: boolean;
}
