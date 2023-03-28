<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary"></ion-menu-button>
        </ion-buttons>
        <ion-title>Sensors</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Sensors</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <ion-list>
            <ion-item v-for="item in items" :key="item.uid">
                <ion-label>
                  <h2></h2>
                  <p></p>
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
import { 
    AbsoluteOrientationSensor, 
    Accelerometer, 
    DataFrame, 
    GravitySensor, 
    Magnetometer, 
    RelativeOrientationSensor, 
    SensorType, 
    SourceNode 
} from '@openhps/core';
import { SensorSourceNode } from '@openhps/capacitor-sensors';

const systemModule = namespace('system');

@Options({
  components: {
    IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel
  }
})
export default class SensorPage extends Vue {
  @systemModule.Action("setCallback") setCallback: (callback: (frame: DataFrame) => void, type: new () => SourceNode) => void;

  items: Array<any> = [];
  sensors: SensorType[] = [
    // Magnetometer,
    // Accelerometer,
    // GravitySensor,
    // AbsoluteOrientationSensor,
    // RelativeOrientationSensor
  ];

  mounted(): void {
    this.setCallback((frame) => {
        const source = frame.source;

    }, SensorSourceNode);
  }
}
</script>

<style scoped lang="scss">

</style>