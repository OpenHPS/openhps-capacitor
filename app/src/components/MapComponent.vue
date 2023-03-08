<template>
  <l-map 
    id="map" 
    :zoom="zoom" 
    :center="center">
    <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
    ></l-tile-layer>
  </l-map>
</template>

<script lang="ts">
import { Vue, Options } from 'vue-property-decorator';
//import L from 'leaflet';
import {
    LMap, LTileLayer
    // @ts-ignore
} from "@vue-leaflet/vue-leaflet";

@Options({
  components: {
    LMap,
    LTileLayer
  }
})
export default class MapComponent extends Vue {
  zoom?: number = 20;
  center: number[] = [47.41322, -1.219482];
}
</script>

<style scoped lang="scss">
@import 'leaflet/dist/leaflet.css';

#map {
  height: 100%;
  width: 100%;
}
</style>