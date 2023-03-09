<template>
  <l-map 
    id="map" 
    :zoom="zoom" 
    :center="isReady && phone.position ? [phone.position.latitude, phone.position.longitude] : [0, 0]">
    <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
    ></l-tile-layer>
    <l-marker 
      key="phone"
      :lat-lng="isReady && phone.position ? [phone.position.latitude, phone.position.longitude] : [0, 0]">
    </l-marker>
  </l-map>
</template>

<script lang="ts">
import { Vue, Options } from 'vue-property-decorator';
//import L from 'leaflet';
import {
    LMap, LTileLayer, LMarker
    // @ts-ignore
} from "@vue-leaflet/vue-leaflet";
import { namespace } from "s-vuex-class";
import type { DataFrame, DataObject } from '@openhps/core';

const systemModule = namespace('system');

@Options({
  components: {
    LMap,
    LTileLayer,
    LMarker
  }
})
export default class MapComponent extends Vue {
  @systemModule.Action("createPositioningModel") createPositioningModel: () => Promise<void>;
  @systemModule.Getter("isReady") isReady: boolean;
  @systemModule.Getter("getPhone") phone: DataObject;
  @systemModule.Action("setCallback") setCallback: (callback: (frame: DataFrame) => void) => void;
  zoom?: number = 20;

  mounted(): void {
    this.createPositioningModel().then(() => {
        this.setDisplayCallback();
    });
  }

  private setDisplayCallback(): void {
      this.setCallback(frame => {
          console.log("display", frame);
      });
  }
}
</script>

<style scoped lang="scss">
@import 'leaflet/dist/leaflet.css';

#map {
  height: 100%;
  width: 100%;
}
</style>