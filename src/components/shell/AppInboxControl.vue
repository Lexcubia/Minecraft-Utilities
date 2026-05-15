<script setup lang="ts">
import { useAppNotificationsStore, type AppNotification } from '@/stores/app-notifications';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t, locale } = useI18n();
const router = useRouter();
const notifications = useAppNotificationsStore();

function formatTime(ts: number): string {
  try {
    const lang = locale.value === 'en' ? 'en' : 'zh-CN';
    return new Intl.DateTimeFormat(lang, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(ts));
  } catch {
    return String(ts);
  }
}

function alertType(n: AppNotification): 'info' | 'success' | 'warning' | 'error' {
  return n.variant;
}

function runAction(n: AppNotification) {
  if (!n.action) return;
  void router.push({ name: n.action.routeName });
  notifications.setInboxOpen(false);
}

const sortedItems = computed(() => [...notifications.items].sort((a, b) => b.createdAt - a.createdAt));

const badgeContent = computed(() => {
  const n = notifications.items.length;
  if (n > 99) return '99+';
  return String(n);
});

function hasProgressRow(n: AppNotification): boolean {
  return n.progressIndeterminate === true || n.progressPercent != null;
}

function progressCaption(n: AppNotification): string {
  const parts = [n.progressLabel?.trim(), n.speedLabel?.trim()].filter(Boolean);
  return parts.join(t('notifications.progressCaptionSep'));
}

function dismissItem(n: AppNotification) {
  n.onDismiss?.();
  notifications.removeById(n.id);
}
</script>

<template>
  <div v-if="notifications.showInboxButton" class="app-inbox-root d-inline-flex align-center">
    <v-menu
      :model-value="notifications.inboxOpen"
      location="bottom end"
      :offset="6"
      scroll-strategy="reposition"
      :close-on-content-click="false"
      content-class="app-inbox-menu-surface"
      @update:model-value="notifications.setInboxOpen($event)"
    >
      <template #activator="{ props: menuActivatorProps }">
        <v-btn
          v-bind="menuActivatorProps"
          icon
          size="x-small"
          density="compact"
          variant="text"
          class="app-inbox-btn"
          :aria-label="t('notifications.inboxAria')"
        >
          <v-badge
            class="app-inbox-badge"
            :model-value="notifications.items.length > 0"
            :content="badgeContent"
            :color="notifications.unreadCount > 0 ? 'error' : 'primary'"
            floating
            offset-x="5"
            offset-y="3"
          >
            <v-icon icon="mdi-bell-outline" size="18" />
          </v-badge>
        </v-btn>
      </template>

      <v-card rounded="lg" class="app-inbox-menu-card" elevation="6" min-width="280" max-width="400">
        <v-card-title class="app-inbox-menu-head d-flex align-center gap-2">
          <span class="app-inbox-menu-head__title">{{ t('notifications.inboxTitle') }}</span>
          <v-spacer />
          <v-btn
            v-if="notifications.items.length"
            variant="text"
            size="x-small"
            color="primary"
            density="compact"
            class="app-inbox-menu-head__action"
            @click="notifications.clearAll()"
          >
            {{ t('notifications.clearAll') }}
          </v-btn>
        </v-card-title>
        <v-divider class="app-inbox-menu-divider border-opacity-25" />
        <v-card-text class="pa-0 app-inbox-menu-body">
          <div v-if="!sortedItems.length" class="app-inbox-empty">
            {{ t('notifications.inboxEmpty') }}
          </div>
          <v-list v-else density="compact" class="py-0 app-inbox-list">
            <v-list-item
              v-for="n in sortedItems"
              :key="n.id"
              class="app-inbox-item align-start"
              :active="!n.read"
            >
              <template #prepend>
                <v-avatar size="26" :color="`${alertType(n)}`" variant="tonal" rounded="lg" class="app-inbox-avatar">
                  <v-icon
                    :icon="
                      n.variant === 'error'
                        ? 'mdi-alert-circle-outline'
                        : n.variant === 'success'
                          ? 'mdi-check-circle-outline'
                          : n.variant === 'warning'
                            ? 'mdi-alert-outline'
                            : 'mdi-information-outline'
                    "
                    size="15"
                  />
                </v-avatar>
              </template>
              <v-list-item-title class="app-inbox-item__title wrap-break-word">
                {{ n.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="app-inbox-item__meta">
                {{ formatTime(n.createdAt) }}
              </v-list-item-subtitle>
              <div v-if="!hasProgressRow(n) && n.body" class="app-inbox-item__body wrap-break-word">
                {{ n.body }}
              </div>
              <div v-if="hasProgressRow(n)" class="app-inbox-item__progress">
                <v-progress-linear
                  rounded
                  height="3"
                  color="primary"
                  bg-opacity="0.12"
                  :indeterminate="n.progressIndeterminate === true"
                  :model-value="n.progressPercent ?? 0"
                />
                <div v-if="progressCaption(n)" class="app-inbox-item__progress-caption wrap-break-word">
                  {{ progressCaption(n) }}
                </div>
              </div>
              <div v-if="n.action" class="app-inbox-item__actions">
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  density="compact"
                  rounded="md"
                  class="app-inbox-item__action-btn"
                  @click="runAction(n)"
                >
                  {{ t(n.action.labelKey) }}
                </v-btn>
              </div>
              <template v-if="n.dismissible" #append>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  density="compact"
                  class="app-inbox-item__dismiss"
                  :aria-label="t('notifications.dismissAria')"
                  @click.stop="dismissItem(n)"
                >
                  <v-icon icon="mdi-close" size="16" />
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-menu>
  </div>
</template>

<style scoped>
.app-inbox-btn {
  min-width: 30px !important;
  width: 30px !important;
  height: 30px !important;
}

.app-inbox-root :deep(.app-inbox-badge .v-badge__badge) {
  font-size: 0.5625rem;
  font-weight: 600;
  line-height: 1;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
}

.app-inbox-menu-head {
  padding: 8px 10px 6px;
  min-height: 0;
}

.app-inbox-menu-head__title {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.app-inbox-menu-head__action {
  font-size: 0.6875rem !important;
  letter-spacing: 0.01em;
  min-width: 0 !important;
  padding-inline: 6px !important;
}

.app-inbox-menu-divider {
  opacity: 0.55;
}

.app-inbox-empty {
  padding: 1.25rem 0.875rem;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.app-inbox-list :deep(.v-list-item) {
  min-height: 0 !important;
  padding-block: 9px !important;
  padding-inline: 10px 10px !important;
}

.app-inbox-list :deep(.v-list-item__prepend > .v-avatar) {
  margin-inline-end: 8px !important;
}

.app-inbox-list :deep(.v-list-item__append) {
  align-self: flex-start;
  margin-top: -2px;
}

.app-inbox-item__dismiss {
  min-width: 22px !important;
  width: 22px !important;
  height: 22px !important;
  opacity: 0.65;
}

.app-inbox-item__dismiss:hover {
  opacity: 1;
}

.app-inbox-list :deep(.v-list-item__content) {
  gap: 2px;
}

.app-inbox-item {
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.65));
}

.app-inbox-item:last-child {
  border-bottom: none;
}

.app-inbox-avatar {
  flex-shrink: 0;
}

.app-inbox-item__title {
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.app-inbox-item__meta {
  font-size: 0.625rem !important;
  line-height: 1.3 !important;
  opacity: 0.62 !important;
  margin-top: 1px !important;
}

.app-inbox-item__body {
  margin-top: 4px;
  font-size: 0.75rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.app-inbox-item__progress {
  margin-top: 6px;
}

.app-inbox-item__progress-caption {
  margin-top: 4px;
  font-size: 0.625rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.app-inbox-item__actions {
  margin-top: 6px;
}

.app-inbox-item__action-btn {
  font-size: 0.6875rem !important;
  letter-spacing: 0.01em;
  min-height: 26px !important;
  padding-inline: 10px !important;
}

.wrap-break-word {
  overflow-wrap: anywhere;
}

.app-inbox-menu-body {
  max-height: min(70vh, 480px);
  overflow-y: auto;
}
</style>

<style>
/* v-menu 传送至 body，非 scoped */
.app-inbox-menu-surface .app-inbox-menu-card {
  max-width: min(100vw - 24px, 400px);
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.85));
  background: rgb(var(--v-theme-surface)) !important;
  backdrop-filter: blur(10px);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.06),
    0 10px 28px -4px rgba(0, 0, 0, 0.1) !important;
}
</style>
