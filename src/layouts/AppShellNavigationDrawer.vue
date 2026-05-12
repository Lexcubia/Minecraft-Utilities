<script setup lang="ts">
import AppShellTrayActions from '@/layouts/AppShellTrayActions.vue';
import type { DrawerLocation } from '@/constants/drawer-location';
import type { UiLanguage } from '@/constants/ui-languages';
import { APP_LOGO_URL } from '@/constants/app-meta';
import { APP_DRAWER_WIDTH_PX } from '@/constants/ui-layout';
import {
  SETTINGS_SECTION_ICONS,
  SETTINGS_SECTIONS,
  settingsRouteName,
} from '@/views/settings/settings-tabs';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const drawerOpen = defineModel<boolean>('drawerOpen', { required: true });
const drawerRail = defineModel<boolean>('drawerRail', { required: true });

const props = defineProps<{
  mdAndUp: boolean;
  /** `v-navigation-drawer` 的 `location`：LTR 下 start=左、end=右 */
  drawerLocation: DrawerLocation;
  isEffectivelyDark: boolean;
  languageChoices: { id: UiLanguage; label: string }[];
  currentUiLanguage: UiLanguage;
}>();

const emit = defineEmits<{
  'toggle-light-dark': [];
  'open-settings': [];
  'set-ui-language': [id: UiLanguage];
}>();

const { t } = useI18n();

const drawerUsesRail = computed(() => props.mdAndUp && drawerRail.value);

const drawerEdgeClass = computed(() =>
  props.drawerLocation === 'end' ? 'drawer-edge--end' : 'drawer-edge--start',
);

/** 侧栏顶部一行展示：简写品牌名 */
const drawerBrandLine = computed(() => t('app.navBrandShort'));

</script>

<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    :rail="drawerUsesRail"
    :temporary="!mdAndUp"
    :location="drawerLocation"
    :width="APP_DRAWER_WIDTH_PX"
    class="shell-navigation-drawer shell-glass-drawer"
    :class="drawerEdgeClass"
  >
    <div class="drawer-inner d-flex flex-column flex-grow-1 overflow-hidden min-h-0">
      <div class="drawer-inner-scroll flex-grow-1 min-h-0 overflow-y-auto">
        <div
          v-if="!drawerUsesRail"
          class="drawer-brand pa-3 d-flex align-center gap-3"
        >
          <div class="app-drawer-brand-mark flex-shrink-0" aria-hidden="true">
            <img :src="APP_LOGO_URL" alt="" width="36" height="36" class="app-pixel-logo" />
          </div>
          <div
            class="text-body-2 font-weight-medium text-medium-emphasis min-w-0 flex-grow-1 text-truncate"
            :title="drawerBrandLine"
          >
            {{ drawerBrandLine }}
          </div>
        </div>

        <div v-else class="drawer-brand-rail d-flex justify-center py-3">
          <div class="app-drawer-brand-mark app-drawer-brand-mark--rail" aria-hidden="true">
            <img :src="APP_LOGO_URL" alt="" width="32" height="32" class="app-pixel-logo" />
          </div>
        </div>

        <v-list density="comfortable" nav class="drawer-nav-list">
          <v-list-item
            :to="{ name: 'welcome' }"
            exact
            :title="t('nav.home')"
            prepend-icon="mdi-home-outline"
            rounded="lg"
          />

          <v-list-subheader
            v-if="!drawerUsesRail"
            class="text-uppercase text-caption font-weight-medium"
          >
            {{ t('nav.toolsSection') }}
          </v-list-subheader>

          <v-list-item
            :to="{ name: 'uuid-migrate' }"
            :title="t('tools.uuidMigrate.navTitle')"
            prepend-icon="mdi-swap-horizontal"
            rounded="lg"
          />

          <v-list-subheader
            v-if="!drawerUsesRail"
            class="text-uppercase text-caption font-weight-medium"
          >
            {{ t('nav.settings') }}
          </v-list-subheader>

          <v-list-item
            v-for="item in SETTINGS_SECTIONS"
            :key="item.id"
            :to="{ name: settingsRouteName(item.id) }"
            :title="t(item.labelKey)"
            :prepend-icon="SETTINGS_SECTION_ICONS[item.id]"
            rounded="lg"
          />
        </v-list>
      </div>

      <template v-if="mdAndUp">
        <div class="drawer-footer-wrap flex-shrink-0">
          <div
            class="drawer-footer-tray"
            :class="drawerUsesRail ? 'drawer-footer-tray--rail' : 'drawer-footer-tray--wide'"
          >
            <template v-if="drawerUsesRail">
              <AppShellTrayActions
                stacked
                :is-effectively-dark="isEffectivelyDark"
                :language-choices="languageChoices"
                :current-ui-language="currentUiLanguage"
                @toggle-light-dark="emit('toggle-light-dark')"
                @open-settings="emit('open-settings')"
                @set-ui-language="emit('set-ui-language', $event)"
              />
            </template>
            <template v-else>
              <div class="drawer-footer-tray-row d-flex align-center justify-center flex-wrap">
                <AppShellTrayActions
                  :is-effectively-dark="isEffectivelyDark"
                  :language-choices="languageChoices"
                  :current-ui-language="currentUiLanguage"
                  @toggle-light-dark="emit('toggle-light-dark')"
                  @open-settings="emit('open-settings')"
                  @set-ui-language="emit('set-ui-language', $event)"
                />
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.shell-navigation-drawer :deep(.v-navigation-drawer__content) {
  padding: 0 !important;
}

.drawer-inner {
  min-height: 100%;
  gap: 0;
}

/* 与主内容分界：内阴影线，避免粗边框 */
.drawer-edge--start {
  box-shadow: inset -1px 0 0 var(--app-on-surface-08);
}

.drawer-edge--end {
  box-shadow: inset 1px 0 0 var(--app-on-surface-08);
}

.drawer-soft-rule {
  height: 1px;
  margin: 0 12px 2px;
  flex-shrink: 0;
  background: var(--app-on-surface-10);
}

.drawer-nav-list {
  padding-block: 0 !important;
}

.drawer-nav-list :deep(.v-list-subheader) {
  min-height: 32px;
  padding-top: 8px;
}

/* 导航项前置图标：无底色块（仅保留整行 hover/active 由 Vuetify 处理） */
.drawer-nav-list :deep(.v-list-item__prepend),
.drawer-nav-list :deep(.v-list-item__prepend .v-icon),
.drawer-nav-list :deep(.v-list-item__prepend .v-avatar) {
  background: transparent !important;
  box-shadow: none !important;
}

.drawer-footer-wrap {
  margin-top: auto;
  /* 与 navigation 底边留出空隙，避免灰底贴边 */
  padding: 0 8px 12px;
}

.drawer-footer-tray {
  border-radius: var(--app-radius-md);
  background: var(--app-on-surface-05);
}

.drawer-footer-tray--wide {
  /* 灰底内上下留白，避免按钮贴底/顶 */
  padding: 10px 8px;
}

.drawer-footer-tray--rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
}

.drawer-footer-tray-row {
  gap: 0;
  row-gap: 0;
}

.drawer-footer-tray :deep(.v-btn:hover),
.drawer-footer-tray :deep(.v-btn:focus-visible) {
  background: var(--app-on-surface-08) !important;
}

.app-drawer-brand-mark {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.app-drawer-brand-mark--rail {
  width: 40px;
  height: 40px;
}

.app-drawer-brand-mark img {
  display: block;
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.app-drawer-brand-mark--rail img {
  width: 32px;
  height: 32px;
}
</style>
