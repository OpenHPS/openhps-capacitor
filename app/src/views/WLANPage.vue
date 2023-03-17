<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary"></ion-menu-button>
        </ion-buttons>
        <ion-title>WLAN</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">WLAN</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <ion-list>
            <ion-item v-for="item in items" :key="item.uid">
                <ion-label>
                  <h2>{{ item.displayName }}</h2>
                  <p>{{ item.uid }}</p>
                </ion-label>
                <ion-label slot="end">
                  <small>{{ item.rssi }}</small>
                </ion-label>
            </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>


<script lang="ts">
import { Vue, Options } from 'vue-property-decorator';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel } from '@ionic/vue';
import { namespace } from "s-vuex-class";
import type { DataFrame, SourceNode } from '@openhps/core';
import { WLANSourceNode } from '@openhps/capacitor-wlan';
import { RelativeRSSI, WLANObject } from '@openhps/rf';

const systemModule = namespace('system');

@Options({
  components: {
    IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel
  }
})
export default class WLANPage extends Vue {
  @systemModule.Action("setCallback") setCallback: (callback: (frame: DataFrame) => void, type: new () => SourceNode) => void;

  items: Array<any> = [];

  mounted(): void {
    this.setCallback((frame) => {
      const source = frame.source;
      const objects = frame.getObjects(WLANObject);
      this.items = objects.map(object => {
        return {
          ...object,
          rssi: (source.getRelativePosition(object.uid) as RelativeRSSI).rssi
        }
      });
    }, WLANSourceNode);
  }
}
</script>

<style scoped lang="scss">

</style>