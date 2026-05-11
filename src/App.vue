<script setup lang="ts">
import { resolveI18nLocale, resolveVuetifyLocale } from '@/i18n';
import {
  buildAppRootBackgroundStyle,
  resolveCustomBackgroundDisplayUrl,
} from '@/utils/buildAppRootBackgroundStyle';
import { usePrefersColorSchemeDark } from '@/composables/usePrefersColorSchemeDark';
import { useSettingsStore } from '@/stores/settings';
import {
  CUSTOM_THEME_PRESET_ID,
  usesAccentControlGradient,
} from '@/constants/theme-color-presets';
import { applyVuetifyThemeColors } from '@/utils/applyVuetifyThemeColors';
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocale, useTheme } from 'vuetify';

const settings = useSettingsStore();
const prefersDark = usePrefersColorSchemeDark();
const theme = useTheme();
const { locale } = useI18n();
const vuetifyLocale = useLocale();

const resolvedDark = computed(() => {
  if (settings.colorScheme === 'dark') return true;
  if (settings.colorScheme === 'light') return false;
  return prefersDark.value;
});

const customBackgroundDisplayUrl = computed(() =>
  resolveCustomBackgroundDisplayUrl({
    customAppBackgroundPath: settings.customAppBackgroundPath,
    customBackgroundObjectUrl: settings.customBackgroundObjectUrl,
  }),
);

const appBackgroundStyle = computed(() =>
  buildAppRootBackgroundStyle(settings.appBackgroundPreset, customBackgroundDisplayUrl.value),
);

const accentGradientActive = computed(() => usesAccentControlGradient(settings.themeColorPreset));

watch(
  resolvedDark,
  (dark) => {
    void theme.change(dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
  },
  { immediate: true },
);

function applyUiLocales() {
  locale.value = resolveI18nLocale(settings.uiLanguage);
  vuetifyLocale.current.value = resolveVuetifyLocale(settings.uiLanguage);
}

watch(() => settings.uiLanguage, applyUiLocales, { immediate: true });

watch(
  () => [settings.themeColorPreset, settings.customThemeColors] as const,
  () => {
    applyVuetifyThemeColors(
      theme,
      settings.themeColorPreset,
      settings.themeColorPreset === CUSTOM_THEME_PRESET_ID
        ? { ...settings.customThemeColors }
        : undefined,
    );
  },
  { immediate: true, deep: true },
);

function onSystemLanguageChange() {
  if (settings.uiLanguage === 'system') applyUiLocales();
}

onMounted(() => {
  window.addEventListener('languagechange', onSystemLanguageChange);
});

onUnmounted(() => {
  window.removeEventListener('languagechange', onSystemLanguageChange);
});
</script>

<template>
  <v-app :class="{ 'app-accent-gradient': accentGradientActive }" :style="appBackgroundStyle">
    <router-view />
  </v-app>
</template>
