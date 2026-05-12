<script setup lang="ts">
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import {
  APP_BACKGROUND_PRESETS,
  getAppBackgroundStyle,
} from '@/constants/app-background-presets';
import { DRAWER_LOCATIONS, type DrawerLocation } from '@/constants/drawer-location';
import {
  CUSTOM_THEME_PRESET_ID,
  THEME_GRADIENT_PRESETS,
  THEME_SOLID_PRESETS,
  gradientSwatchStyle,
} from '@/constants/theme-color-presets';
import {
  UI_FONT_PRESET_IDS,
  uiFontStackVar,
  type UiFontPresetId,
} from '@/constants/ui-font-presets';
import type { ColorScheme } from '@/stores/settings';
import { useSettingsStore } from '@/stores/settings';
import { pickAppBackgroundWithNativeDialog } from '@/utils/pickAppBackgroundNative';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const settings = useSettingsStore();

const backgroundFileInput = useTemplateRef<HTMLInputElement>('backgroundFileInput');

const hasCustomBackground = computed(
  () =>
    Boolean(settings.customAppBackgroundPath) || Boolean(settings.customBackgroundObjectUrl),
);

const customBackgroundSummary = computed(() => {
  if (settings.customAppBackgroundPath) {
    const parts = settings.customAppBackgroundPath.split(/[/\\]/);
    return parts[parts.length - 1] ?? settings.customAppBackgroundPath;
  }
  if (settings.customBackgroundObjectUrl) {
    return t('settings.appearance.customBackgroundSessionOnly');
  }
  return '';
});

async function onPickCustomBackground() {
  if (isTauriRuntime()) {
    await pickAppBackgroundWithNativeDialog();
    return;
  }
  backgroundFileInput.value?.click();
}

function onCustomBackgroundFileChange(ev: Event) {
  const el = ev.target as HTMLInputElement;
  const file = el.files?.[0];
  el.value = '';
  if (!file || !file.type.startsWith('image/')) return;
  settings.revokeCustomBackgroundObjectUrl();
  settings.customAppBackgroundPath = '';
  settings.customBackgroundObjectUrl = URL.createObjectURL(file);
}

const themeOptions = computed((): { label: string; value: ColorScheme }[] => [
  { label: t('settings.appearance.themeLight'), value: 'light' },
  { label: t('settings.appearance.themeDark'), value: 'dark' },
  { label: t('settings.appearance.themeSystem'), value: 'system' },
]);

const fontPresetOptions = computed((): { label: string; value: UiFontPresetId }[] =>
  [...UI_FONT_PRESET_IDS].map((id) => ({
    value: id,
    label: t(`settings.appearance.fontPreset.${id}`),
  })),
);

const solidAccentPresets = computed(() =>
  THEME_SOLID_PRESETS.map((p) => ({
    id: p.id,
    label: t(`settings.appearance.accent.${p.id}`),
    swatch: p.light.primary,
  })),
);

const gradientAccentPresets = computed(() =>
  THEME_GRADIENT_PRESETS.map((p) => ({
    id: p.id,
    label: t(`settings.appearance.gradient.${p.id}`),
    gradientCss: gradientSwatchStyle(p.light),
  })),
);

const customColorMenuOpen = ref(false);

const customAccentSwatchGradient = computed(() =>
  gradientSwatchStyle(settings.customThemeColors.light),
);

const customLightMenuGradient = computed(() =>
  gradientSwatchStyle(settings.customThemeColors.light),
);

const customDarkMenuGradient = computed(() =>
  gradientSwatchStyle(settings.customThemeColors.dark),
);

watch(customColorMenuOpen, (open) => {
  if (open) settings.themeColorPreset = CUSTOM_THEME_PRESET_ID;
});

function onCustomColorInput(mode: 'light' | 'dark', role: 'primary' | 'secondary', e: Event) {
  const el = e.target as HTMLInputElement;
  settings.setCustomThemeColor(mode, role, el.value);
}

const drawerLocationOptions = computed((): { label: string; value: DrawerLocation }[] =>
  [...DRAWER_LOCATIONS].map((loc) => ({
    value: loc,
    label: t(`settings.appearance.drawerLocation.${loc}`),
  })),
);

const backgroundChoices = computed(() =>
  APP_BACKGROUND_PRESETS.map((p) => ({
    id: p.id,
    label: t(`settings.appearance.appBackground.${p.id}`),
    previewStyle: getAppBackgroundStyle(p.id),
  })),
);


</script>

<template>
  <div class="d-flex flex-column gap-4">
    <AppGlassSectionCard>
      <template #title>{{ t('settings.appearance.themeTitle') }}</template>
      <div class="flex flex-wrap gap-2">
          <v-btn
            v-for="opt in themeOptions"
            :key="opt.value"
            min-width="96"
            :variant="settings.colorScheme === opt.value ? 'flat' : 'tonal'"
            :color="settings.colorScheme === opt.value ? 'primary' : 'surface-variant'"
            @click="settings.colorScheme = opt.value"
          >
            {{ opt.label }}
          </v-btn>
        </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard>
      <template #title>{{ t('settings.appearance.colorTitle') }}</template>
      <div class="d-flex flex-column gap-4">
        <div class="flex flex-wrap gap-2">
          <v-btn
            v-for="p in solidAccentPresets"
            :key="p.id"
            min-width="112"
            class="appearance-color-preset-btn text-none justify-start"
            :variant="settings.themeColorPreset === p.id ? 'outlined' : 'tonal'"
            :color="settings.themeColorPreset === p.id ? 'primary' : 'surface-variant'"
            @click="settings.themeColorPreset = p.id"
          >
            <template #prepend>
              <span
                class="accent-swatch rounded-circle flex-shrink-0"
                :style="{ backgroundColor: p.swatch }"
                aria-hidden="true"
              />
            </template>
            {{ p.label }}
          </v-btn>
          <v-btn
            v-for="p in gradientAccentPresets"
            :key="p.id"
            min-width="112"
            class="appearance-color-preset-btn text-none justify-start"
            :variant="settings.themeColorPreset === p.id ? 'outlined' : 'tonal'"
            :color="settings.themeColorPreset === p.id ? 'primary' : 'surface-variant'"
            @click="settings.themeColorPreset = p.id"
          >
            <template #prepend>
              <span
                class="accent-swatch accent-swatch--gradient rounded-pill flex-shrink-0"
                :style="{ backgroundImage: p.gradientCss }"
                aria-hidden="true"
              />
            </template>
            {{ p.label }}
          </v-btn>
        </div>

        <div class="flex flex-wrap gap-2">
          <v-menu
            v-model="customColorMenuOpen"
            :close-on-content-click="false"
            location="bottom start"
            :offset="8"
            transition="scale-transition"
          >
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                min-width="112"
                class="appearance-color-preset-btn text-none justify-start"
                :variant="settings.themeColorPreset === CUSTOM_THEME_PRESET_ID ? 'outlined' : 'tonal'"
                :color="settings.themeColorPreset === CUSTOM_THEME_PRESET_ID ? 'primary' : 'surface-variant'"
                :aria-label="t('settings.appearance.customColorButton')"
                :aria-expanded="customColorMenuOpen"
              >
                <template #prepend>
                  <span class="accent-swatch-stack flex-shrink-0" aria-hidden="true">
                    <span
                      class="accent-swatch accent-swatch--custom rounded-circle"
                      :style="{ backgroundImage: customAccentSwatchGradient }"
                    />
                    <span class="accent-swatch-plus-badge">
                      <v-icon icon="mdi-plus" size="10" />
                    </span>
                  </span>
                </template>
                {{ t('settings.appearance.customColorButton') }}
              </v-btn>
            </template>
            <v-card class="color-custom-menu" min-width="300" max-width="360" rounded="md" elevation="12">
              <div class="color-custom-menu-header pa-4 pb-3">
                <div class="d-flex align-center gap-2 mb-1">
                  <v-avatar size="36" color="primary" variant="tonal" rounded="md">
                    <v-icon icon="mdi-palette-swatch" size="22" color="primary" />
                  </v-avatar>
                  <div class="min-w-0">
                    <div class="text-subtitle-1 font-weight-medium">
                      {{ t('settings.appearance.customColorMenuTitle') }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ t('settings.appearance.customColorMenuSubtitle') }}
                    </div>
                  </div>
                </div>
                <div class="text-overline text-medium-emphasis mb-2 text-uppercase">
                  {{ t('settings.appearance.customColorMenuPreview') }}
                </div>
                <div class="d-flex gap-2 align-center">
                  <v-icon size="16" class="text-medium-emphasis flex-shrink-0" icon="mdi-white-balance-sunny" />
                  <div
                    class="color-custom-menu-preview-bar flex-grow-1 rounded-pill"
                    :style="{ backgroundImage: customLightMenuGradient }"
                    role="img"
                    :aria-label="t('settings.appearance.customColorLight')"
                  />
                </div>
                <div class="d-flex gap-2 align-center mt-2">
                  <v-icon size="16" class="text-medium-emphasis flex-shrink-0" icon="mdi-moon-waning-crescent" />
                  <div
                    class="color-custom-menu-preview-bar flex-grow-1 rounded-pill"
                    :style="{ backgroundImage: customDarkMenuGradient }"
                    role="img"
                    :aria-label="t('settings.appearance.customColorDark')"
                  />
                </div>
              </div>

              <v-divider class="border-opacity-50" />

              <v-card-text class="pa-4">
                <section class="color-custom-section">
                  <div class="d-flex align-center gap-2 mb-3">
                    <v-icon size="20" class="text-medium-emphasis" icon="mdi-white-balance-sunny" />
                    <span class="text-subtitle-2 font-weight-medium">{{
                      t('settings.appearance.customColorLight')
                    }}</span>
                  </div>
                  <div class="d-flex gap-3">
                    <label class="color-custom-field flex-grow-1">
                      <span class="text-caption text-medium-emphasis d-block mb-1">{{
                        t('settings.appearance.customColorPrimary')
                      }}</span>
                      <div class="color-custom-field-hit rounded-lg">
                        <div
                          class="color-custom-field-fill"
                          :style="{ backgroundColor: settings.customThemeColors.light.primary }"
                        />
                        <input
                          type="color"
                          class="color-custom-field-input"
                          :value="settings.customThemeColors.light.primary"
                          @input="onCustomColorInput('light', 'primary', $event)"
                        />
                      </div>
                    </label>
                    <label class="color-custom-field flex-grow-1">
                      <span class="text-caption text-medium-emphasis d-block mb-1">{{
                        t('settings.appearance.customColorSecondary')
                      }}</span>
                      <div class="color-custom-field-hit rounded-lg">
                        <div
                          class="color-custom-field-fill"
                          :style="{ backgroundColor: settings.customThemeColors.light.secondary }"
                        />
                        <input
                          type="color"
                          class="color-custom-field-input"
                          :value="settings.customThemeColors.light.secondary"
                          @input="onCustomColorInput('light', 'secondary', $event)"
                        />
                      </div>
                    </label>
                  </div>
                </section>

                <v-divider class="my-4 border-opacity-50" />

                <section class="color-custom-section mb-0">
                  <div class="d-flex align-center gap-2 mb-3">
                    <v-icon size="20" class="text-medium-emphasis" icon="mdi-moon-waning-crescent" />
                    <span class="text-subtitle-2 font-weight-medium">{{
                      t('settings.appearance.customColorDark')
                    }}</span>
                  </div>
                  <div class="d-flex gap-3">
                    <label class="color-custom-field flex-grow-1">
                      <span class="text-caption text-medium-emphasis d-block mb-1">{{
                        t('settings.appearance.customColorPrimary')
                      }}</span>
                      <div class="color-custom-field-hit rounded-lg">
                        <div
                          class="color-custom-field-fill"
                          :style="{ backgroundColor: settings.customThemeColors.dark.primary }"
                        />
                        <input
                          type="color"
                          class="color-custom-field-input"
                          :value="settings.customThemeColors.dark.primary"
                          @input="onCustomColorInput('dark', 'primary', $event)"
                        />
                      </div>
                    </label>
                    <label class="color-custom-field flex-grow-1">
                      <span class="text-caption text-medium-emphasis d-block mb-1">{{
                        t('settings.appearance.customColorSecondary')
                      }}</span>
                      <div class="color-custom-field-hit rounded-lg">
                        <div
                          class="color-custom-field-fill"
                          :style="{ backgroundColor: settings.customThemeColors.dark.secondary }"
                        />
                        <input
                          type="color"
                          class="color-custom-field-input"
                          :value="settings.customThemeColors.dark.secondary"
                          @input="onCustomColorInput('dark', 'secondary', $event)"
                        />
                      </div>
                    </label>
                  </div>
                </section>
              </v-card-text>
            </v-card>
          </v-menu>
        </div>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard>
      <template #title>{{ t('settings.appearance.fontTitle') }}</template>
      <div class="flex flex-wrap gap-2">
        <v-btn
          v-for="opt in fontPresetOptions"
          :key="opt.value"
          min-width="112"
          class="appearance-font-preset-btn text-none"
          :style="{ fontFamily: uiFontStackVar(opt.value) }"
          :variant="settings.uiFontPreset === opt.value ? 'flat' : 'tonal'"
          :color="settings.uiFontPreset === opt.value ? 'primary' : 'surface-variant'"
          @click="settings.uiFontPreset = opt.value"
        >
          {{ opt.label }}
        </v-btn>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard>
      <template #title>{{ t('settings.appearance.backgroundTitle') }}</template>
      <div>
        <div class="d-flex flex-wrap gap-2">
          <v-btn
            v-for="row in backgroundChoices"
            :key="row.id"
            class="bg-preset-btn text-none"
            min-width="88"
            max-width="112"
            height="auto"
            :variant="settings.appBackgroundPreset === row.id ? 'flat' : 'tonal'"
            :color="settings.appBackgroundPreset === row.id ? 'primary' : 'surface-variant'"
            @click="settings.appBackgroundPreset = row.id"
          >
            <div class="d-flex flex-column align-center gap-1 py-2 px-1">
              <span
                class="app-bg-preview app-bg-preview--tile rounded flex-shrink-0"
                :class="{ 'app-bg-preview--none': row.id === 'none' }"
                :style="row.previewStyle"
                aria-hidden="true"
              />
              <span class="text-caption text-center text-truncate w-100">{{ row.label }}</span>
            </div>
          </v-btn>
        </div>

        <v-divider class="my-4 opacity-25" />

        <div class="d-flex flex-wrap gap-2 align-center">
          <v-btn color="primary" variant="tonal" size="small" @click="onPickCustomBackground">
            {{ t('settings.appearance.customBackgroundPick') }}
          </v-btn>
          <v-btn
            variant="text"
            color="error"
            size="small"
            :disabled="!hasCustomBackground"
            @click="settings.clearCustomAppBackground()"
          >
            {{ t('settings.appearance.customBackgroundClear') }}
          </v-btn>
        </div>
        <input
          ref="backgroundFileInput"
          type="file"
          class="d-none"
          accept="image/*"
          aria-hidden="true"
          @change="onCustomBackgroundFileChange"
        />
        <div
          v-if="hasCustomBackground"
          class="text-caption text-medium-emphasis mt-2 text-truncate"
        >
          {{ t('settings.appearance.customBackgroundActive') }}: {{ customBackgroundSummary }}
        </div>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard>
      <template #title>{{ t('settings.appearance.layoutTitle') }}</template>
      <div class="d-flex flex-column gap-5">
        <div>
          <div class="text-subtitle-2 font-weight-medium mb-2">
            {{ t('settings.appearance.layoutDrawerTitle') }}
          </div>
          <div class="flex flex-wrap gap-2">
            <v-btn
              v-for="opt in drawerLocationOptions"
              :key="opt.value"
              min-width="96"
              :variant="settings.drawerLocation === opt.value ? 'flat' : 'tonal'"
              :color="settings.drawerLocation === opt.value ? 'primary' : 'surface-variant'"
              @click="settings.drawerLocation = opt.value"
            >
              {{ opt.label }}
            </v-btn>
          </div>
        </div>

        <v-divider class="opacity-25" />

        <div>
          <div class="text-subtitle-2 font-weight-medium mb-2">
            {{ t('settings.appearance.layoutVisitedTabsTitle') }}
          </div>
          <v-switch
            v-model="settings.showVisitedTabBar"
            color="primary"
            density="compact"
            hide-details
            inset
            :label="t('settings.appearance.layoutVisitedTabsSwitch')"
          />
        </div>
      </div>
    </AppGlassSectionCard>
  </div>
</template>

<style scoped>
.appearance-font-preset-btn :deep(.v-btn__content) {
  font-family: inherit;
}

/* 颜色预设按钮：文案与 prepend 色块整体左对齐 */
.appearance-color-preset-btn :deep(.v-btn__content) {
  justify-content: flex-start;
  width: 100%;
}

.appearance-color-preset-btn :deep(.v-btn__prepend) {
  margin-inline-end: 8px;
}

.accent-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.accent-swatch--gradient {
  width: 28px;
  border-radius: 999px;
  background-size: cover;
}

.accent-swatch-stack {
  position: relative;
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
}

.accent-swatch--custom {
  width: 14px;
  height: 14px;
  background-size: cover;
  background-position: center;
}

.accent-swatch-plus-badge {
  position: absolute;
  right: -5px;
  bottom: -5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  color: rgb(var(--v-theme-primary));
}

.color-custom-menu {
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.color-custom-menu-header {
  background: linear-gradient(
    165deg,
    color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, rgb(var(--v-theme-surface))) 0%,
    rgb(var(--v-theme-surface)) 55%
  );
}

.color-custom-menu-preview-bar {
  height: 10px;
  background-size: cover;
  background-position: center;
  box-shadow:
    inset 0 0 0 1px rgba(var(--v-theme-on-surface), 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06);
}

.color-custom-field-hit {
  position: relative;
  height: 44px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.color-custom-field-hit:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.color-custom-field-fill {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.color-custom-field-input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  cursor: pointer;
  opacity: 0;
}

.app-bg-preview {
  display: inline-block;
  width: 56px;
  height: 36px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.app-bg-preview--tile {
  width: 48px;
  height: 32px;
}

.bg-preset-btn {
  padding-inline: 4px !important;
}

.app-bg-preview--none {
  background-color: rgb(var(--v-theme-background));
}
</style>
