<script setup lang="ts">
import type { UiLanguage } from '@/constants/ui-languages';
import { useI18n } from 'vue-i18n';

withDefaults(
  defineProps<{
    isEffectivelyDark: boolean;
    languageChoices: { id: UiLanguage; label: string }[];
    currentUiLanguage: UiLanguage;
    /** 侧栏 rail：纵向排列 */
    stacked?: boolean;
  }>(),
  { stacked: false },
);

const emit = defineEmits<{
  'toggle-light-dark': [];
  'open-settings': [];
  'set-ui-language': [id: UiLanguage];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="shell-tray-actions d-flex align-center flex-shrink-0"
    :class="stacked ? 'shell-tray-actions--stacked' : 'flex-row'"
  >
    <v-btn
      icon
      size="x-small"
      density="compact"
      variant="text"
      class="shell-tray-action-btn"
      :aria-label="isEffectivelyDark ? t('nav.themeSwitchToLight') : t('nav.themeSwitchToDark')"
      @click="emit('toggle-light-dark')"
    >
      <v-icon
        :icon="isEffectivelyDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
        size="18"
      />
    </v-btn>

    <v-menu location="bottom end">
      <template #activator="{ props: menuProps }">
        <v-btn
          icon
          size="x-small"
          density="compact"
          variant="text"
          class="shell-tray-action-btn"
          :aria-label="t('nav.languageMenu')"
          v-bind="menuProps"
        >
          <v-icon icon="mdi-translate" size="18" />
        </v-btn>
      </template>
      <v-list density="compact" min-width="200">
        <v-list-item
          v-for="row in languageChoices"
          :key="row.id"
          :title="row.label"
          :active="currentUiLanguage === row.id"
          rounded="lg"
          @click="emit('set-ui-language', row.id)"
        />
      </v-list>
    </v-menu>

    <v-btn
      icon
      size="x-small"
      density="compact"
      variant="text"
      class="shell-tray-action-btn"
      :aria-label="t('nav.settings')"
      @click="emit('open-settings')"
    >
      <v-icon icon="mdi-cog-outline" size="18" />
    </v-btn>
  </div>
</template>

<style scoped>
.shell-tray-actions {
  gap: 0;
}

.shell-tray-actions--stacked {
  flex-direction: column;
  gap: 2px;
}

.shell-tray-action-btn {
  min-width: 30px !important;
  width: 30px !important;
  height: 30px !important;
}
</style>
