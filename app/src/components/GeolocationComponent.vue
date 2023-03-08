<template>
  <div>

  </div>
</template>

<script lang="ts">
import { Vue, Options } from 'vue-property-decorator';
import { namespace } from "s-vuex-class";
import { DataFrame } from "@openhps/core";

const systemModule = namespace('system');

@Options({
  components: {
  }
})
export default class GeolocationComponent extends Vue {
    @systemModule.Action("createPositioningModel") createPositioningModel: () => Promise<void>;
    @systemModule.Getter("isReady") isReady: boolean;
    @systemModule.Action("setCallback") setCallback: (callback: (frame: DataFrame) => void) => void;

    mounted(): void {
        if (!this.isReady) {
            this.createPositioningModel().then(() => {
                this.setDisplayCallback();
            });
        } else {
            this.setDisplayCallback();
        }
    }

    private setDisplayCallback(): void {
        this.setCallback(frame => {
            console.log(frame);
        });
    }
}
</script>

<style scoped lang="scss">

</style>