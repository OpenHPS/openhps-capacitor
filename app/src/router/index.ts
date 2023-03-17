import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '',
    component: () => import ('../views/MapPage.vue')
  },
  {
    path: '/ble',
    component: () => import ('../views/BluetoothPage.vue')
  },
  {
    path: '/wlan',
    component: () => import ('../views/WLANPage.vue')
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;
