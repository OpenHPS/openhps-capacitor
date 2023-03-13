<template>
    <ion-modal :is-open="isOpen">
        <ion-header>
            <ion-toolbar>
                <ion-title>Positioning System</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p>
                This application requires permissions to start the positioning system.
            </p>
            <ion-button @click="onAccept(true)">Allow</ion-button>
            <ion-button @click="onAccept(false)">Reject</ion-button>
        </ion-content>
    </ion-modal>
</template>

<script lang="ts">
import { Vue, Options } from 'vue-property-decorator';
import { IonModal, IonContent, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/vue';

@Options({
  components: {
    IonModal, IonButton, IonContent, IonHeader, IonTitle, IonToolbar
  },
  props: {
    callback: Function
  }
})
export default class PermissionModal extends Vue {
    isOpen = true;
    declare callback: () => Promise<void>;

    setOpen(isOpen: boolean) {
        this.isOpen = isOpen;
    }

    onAccept(accept: boolean) {
        if (accept) {
            this.callback().then(() => {
                this.setOpen(false);
            }).catch(err => {
                console.error(err);

            })
        } else {
            this.setOpen(false);
        }
    }
}
</script>

<style scoped lang="scss">

</style>