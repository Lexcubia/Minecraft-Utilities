import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import { en as vuetifyEn, zhHans } from 'vuetify/locale';
import 'vuetify/styles';

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#2e7d32',
          secondary: '#558b2f',
          background: '#f5f5f5',
          surface: '#ffffff',
          // 浅色：略深于 surface 的容器底，避免与默认调色合并后出现深浅颠倒
          surfaceVariant: '#e8ebe8',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#81c784',
          secondary: '#aed581',
          background: '#121212',
          surface: '#1e1e1e',
          // 深色：略亮于 surface，作为分区容器底
          surfaceVariant: '#2d3230',
        },
      },
    },
  },
  locale: {
    locale: 'zhHans',
    fallback: 'en',
    messages: { zhHans, en: vuetifyEn },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
});
