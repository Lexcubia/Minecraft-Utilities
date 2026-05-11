import '@/styles/tailwind.css';
import vuetify from '@/plugins/vuetify';
import '@/styles/app-shell-scroll.css';
import '@/styles/shell-glass.css';
import '@/styles/accent-gradient.css';
import { i18n } from '@/i18n';
import App from '@/App.vue';
import router from '@/router';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);
app.use(vuetify);
app.mount('#app');
