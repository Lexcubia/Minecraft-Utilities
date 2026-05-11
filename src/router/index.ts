import type { RouteLocationGeneric } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import { AppShellLayout, SettingsLayout } from '@/layouts';
import AboutSettingsView from '@/views/settings/AboutSettingsView.vue';
import AppearanceSettingsView from '@/views/settings/AppearanceSettingsView.vue';
import GeneralSettingsView from '@/views/settings/GeneralSettingsView.vue';
import UpdatesSettingsView from '@/views/settings/UpdatesSettingsView.vue';
import WelcomeView from '@/views/WelcomeView.vue';
import {
  hashToSettingsTab,
  normalizeSettingsTab,
  settingsRouteName,
  type SettingsTab,
} from '@/views/settings/settings-tabs';

function settingsRedirect(to: RouteLocationGeneric) {
  const fromHash = hashToSettingsTab(to.hash || undefined);
  const tabParam = to.query.tab;
  const fromQuery = typeof tabParam === 'string' ? normalizeSettingsTab(tabParam) : null;
  const tab: SettingsTab = fromHash ?? fromQuery ?? 'general';
  return { name: settingsRouteName(tab), replace: true };
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShellLayout,
      children: [
        { path: '', name: 'welcome', component: WelcomeView },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsLayout,
          redirect: settingsRedirect,
          children: [
            {
              path: 'general',
              name: 'settings-general',
              component: GeneralSettingsView,
            },
            {
              path: 'appearance',
              name: 'settings-appearance',
              component: AppearanceSettingsView,
            },
            {
              path: 'updates',
              name: 'settings-updates',
              component: UpdatesSettingsView,
            },
            {
              path: 'about',
              name: 'settings-about',
              component: AboutSettingsView,
            },
          ],
        },
      ],
    },
  ],
});

export default router;
