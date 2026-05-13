<script setup lang="ts">
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import { getUiLanguageChoiceIds, uiLanguageOptionLabelKey, type UiLanguage } from '@/constants/ui-languages';
import { useSettingsStore } from '@/stores/settings';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const settings = useSettingsStore();
const showKey = ref(false);

const languageOptions = computed((): { label: string; value: UiLanguage }[] =>
  getUiLanguageChoiceIds().map((id) => ({
    value: id,
    label: t(uiLanguageOptionLabelKey(id)),
  })),
);
</script>

<template>
  <AppGlassSectionCard>
    <div class="d-flex flex-column gap-5">
      <div>
        <div class="text-body-1 font-weight-medium mb-2">{{ t('settings.general.languageTitle') }}</div>
        <div class="flex flex-wrap gap-2">
          <v-btn
            v-for="opt in languageOptions"
            :key="opt.value"
            min-width="96"
            :variant="settings.uiLanguage === opt.value ? 'flat' : 'tonal'"
            :color="settings.uiLanguage === opt.value ? 'primary' : 'surface-variant'"
            @click="settings.uiLanguage = opt.value"
          >
            {{ opt.label }}
          </v-btn>
        </div>
      </div>

      <div>
        <div class="text-body-1 font-weight-medium mb-2">{{ t('settings.general.dryRunTitle') }}</div>
        <div class="flex flex-wrap gap-2">
          <v-btn
            min-width="96"
            :variant="settings.defaultDryRun ? 'flat' : 'tonal'"
            :color="settings.defaultDryRun ? 'primary' : 'surface-variant'"
            @click="settings.defaultDryRun = true"
          >
            {{ t('common.on') }}
          </v-btn>
          <v-btn
            min-width="96"
            :variant="!settings.defaultDryRun ? 'flat' : 'tonal'"
            :color="!settings.defaultDryRun ? 'primary' : 'surface-variant'"
            @click="settings.defaultDryRun = false"
          >
            {{ t('common.off') }}
          </v-btn>
        </div>
      </div>

      <div>
        <div class="text-body-1 font-weight-medium mb-2">{{ t('settings.general.closeBehaviorTitle') }}</div>
        <div class="flex flex-wrap gap-2">
          <v-btn
            min-width="140"
            :variant="settings.closeBehavior === 'tray' ? 'flat' : 'tonal'"
            :color="settings.closeBehavior === 'tray' ? 'primary' : 'surface-variant'"
            @click="settings.closeBehavior = 'tray'"
          >
            {{ t('settings.general.closeBehaviorTray') }}
          </v-btn>
          <v-btn
            min-width="140"
            :variant="settings.closeBehavior === 'quit' ? 'flat' : 'tonal'"
            :color="settings.closeBehavior === 'quit' ? 'primary' : 'surface-variant'"
            @click="settings.closeBehavior = 'quit'"
          >
            {{ t('settings.general.closeBehaviorQuit') }}
          </v-btn>
        </div>
      </div>

      <div>
        <div class="text-body-1 font-weight-medium mb-2">{{ t('settings.general.curseKeyLabel') }}</div>
        <v-text-field
          v-model="settings.curseForgeApiKey"
          :type="showKey ? 'text' : 'password'"
          variant="filled"
          density="comfortable"
          color="primary"
          :placeholder="t('settings.general.curseKeyPlaceholder')"
          clearable
          hide-details="auto"
          :append-inner-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showKey = !showKey"
        />
      </div>
    </div>
  </AppGlassSectionCard>
</template>
