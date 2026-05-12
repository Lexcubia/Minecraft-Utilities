<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const { t } = useI18n();

const APP_CONTEXT_MENU_SURFACE_SELECTOR = '.app-context-menu-surface';

type MenuMode = 'closed' | 'edit' | 'selection';

const menu = ref<{
  mode: MenuMode;
  x: number;
  y: number;
  editable: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null;
}>({ mode: 'closed', x: 0, y: 0, editable: null });

const docSelectionText = ref('');

let dismissPointer: ((e: MouseEvent) => void) | null = null;

function removeDismissListeners() {
  if (!dismissPointer) return;
  window.removeEventListener('click', dismissPointer, true);
  window.removeEventListener('contextmenu', dismissPointer, true);
  dismissPointer = null;
}

function closeMenu() {
  removeDismissListeners();
  menu.value.mode = 'closed';
  menu.value.editable = null;
  docSelectionText.value = '';
}

function scheduleDismiss() {
  void nextTick(() => {
    setTimeout(() => {
      removeDismissListeners();
      dismissPointer = (e: MouseEvent) => {
        const el = e.target;
        if (el instanceof Element && el.closest(APP_CONTEXT_MENU_SURFACE_SELECTOR)) return;
        closeMenu();
      };
      window.addEventListener('click', dismissPointer, true);
      window.addEventListener('contextmenu', dismissPointer, true);
    }, 0);
  });
}

function onMenuKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu();
}

watch(
  () => menu.value.mode !== 'closed',
  (open) => {
    if (open) window.addEventListener('keydown', onMenuKeydown);
    else window.removeEventListener('keydown', onMenuKeydown);
  },
);

onUnmounted(() => {
  removeDismissListeners();
  window.removeEventListener('keydown', onMenuKeydown);
  document.removeEventListener('contextmenu', onContextMenuCapture, true);
});

function getEditableElement(el: Element): HTMLInputElement | HTMLTextAreaElement | HTMLElement | null {
  const base = el.closest('input, textarea, [contenteditable]');
  if (!base) return null;
  if (base instanceof HTMLInputElement) {
    const ty = base.type;
    if (
      ty === 'button' ||
      ty === 'checkbox' ||
      ty === 'radio' ||
      ty === 'submit' ||
      ty === 'reset' ||
      ty === 'file' ||
      ty === 'hidden' ||
      ty === 'range' ||
      ty === 'color' ||
      ty === 'image'
    ) {
      return null;
    }
    if (base.disabled || base.readOnly) return null;
    return base;
  }
  if (base instanceof HTMLTextAreaElement) {
    if (base.disabled || base.readOnly) return null;
    return base;
  }
  if (base instanceof HTMLElement && base.isContentEditable) return base;
  return null;
}

function editableSelectionText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const a = el.selectionStart ?? 0;
    const b = el.selectionEnd ?? 0;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return el.value.slice(lo, hi);
  }
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const an = sel.anchorNode;
  if (!an || !el.contains(an)) return '';
  return sel.toString();
}

function selectAllInEditable(el: HTMLElement) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    el.select();
    return;
  }
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = document.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
  el.focus();
}

async function actionCopy() {
  const ed = menu.value.editable;
  if (ed) {
    const slice = editableSelectionText(ed);
    if (slice) await navigator.clipboard.writeText(slice);
    else await navigator.clipboard.writeText(
      ed instanceof HTMLInputElement || ed instanceof HTMLTextAreaElement ? ed.value : ed.innerText,
    );
  } else if (docSelectionText.value) {
    await navigator.clipboard.writeText(docSelectionText.value);
  }
  closeMenu();
}

async function actionCut() {
  const ed = menu.value.editable;
  if (!ed) return;
  if (ed instanceof HTMLInputElement || ed instanceof HTMLTextAreaElement) {
    const a = ed.selectionStart ?? 0;
    const b = ed.selectionEnd ?? 0;
    if (a === b) {
      closeMenu();
      return;
    }
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const slice = ed.value.slice(lo, hi);
    await navigator.clipboard.writeText(slice);
    ed.value = ed.value.slice(0, lo) + ed.value.slice(hi);
    ed.selectionStart = ed.selectionEnd = lo;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    ed.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (ed.isContentEditable) {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) {
      closeMenu();
      return;
    }
    const text = sel.toString();
    if (!text) {
      closeMenu();
      return;
    }
    await navigator.clipboard.writeText(text);
    if (typeof sel.deleteFromDocument === 'function') sel.deleteFromDocument();
    else sel.getRangeAt(0).deleteContents();
  }
  closeMenu();
}

async function actionPaste() {
  const ed = menu.value.editable;
  if (!ed) return;
  if (ed instanceof HTMLInputElement || ed instanceof HTMLTextAreaElement) {
    if (ed.readOnly) return;
  }
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    closeMenu();
    return;
  }
  if (ed instanceof HTMLInputElement || ed instanceof HTMLTextAreaElement) {
    const a = ed.selectionStart ?? 0;
    const b = ed.selectionEnd ?? 0;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    ed.value = ed.value.slice(0, lo) + text + ed.value.slice(hi);
    const pos = lo + text.length;
    ed.selectionStart = ed.selectionEnd = pos;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
    ed.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (ed.isContentEditable) {
    document.execCommand('insertText', false, text);
  }
  closeMenu();
}

function actionSelectAll() {
  const ed = menu.value.editable;
  if (!ed) return;
  selectAllInEditable(ed);
  closeMenu();
}

const cutDisabled = computed(() => {
  const ed = menu.value.editable;
  if (!ed || menu.value.mode !== 'edit') return true;
  return editableSelectionText(ed).length === 0;
});

const copyDisabled = computed(() => {
  if (menu.value.mode === 'selection') return docSelectionText.value.length === 0;
  const ed = menu.value.editable;
  if (!ed) return true;
  if (editableSelectionText(ed).length > 0) return false;
  if (ed instanceof HTMLInputElement || ed instanceof HTMLTextAreaElement) return ed.value.length === 0;
  return ed.innerText.length === 0;
});

const pasteDisabled = computed(() => {
  const ed = menu.value.editable;
  if (!ed || menu.value.mode !== 'edit') return true;
  if (ed instanceof HTMLInputElement || ed instanceof HTMLTextAreaElement) return ed.readOnly;
  return false;
});

const selectAllDisabled = computed(() => {
  const ed = menu.value.editable;
  if (!ed || menu.value.mode !== 'edit') return true;
  if (ed instanceof HTMLInputElement || ed instanceof HTMLTextAreaElement) {
    return ed.value.length === 0;
  }
  return ed.innerText.length === 0;
});

function openAt(e: MouseEvent, mode: 'edit' | 'selection', editable: HTMLElement | null, docSel: string) {
  const pad = 8;
  const mw = 188;
  const mh = mode === 'edit' ? 220 : 120;
  menu.value.mode = mode;
  menu.value.editable = editable;
  docSelectionText.value = docSel;
  menu.value.x = Math.min(e.clientX, window.innerWidth - mw - pad);
  menu.value.y = Math.min(e.clientY, window.innerHeight - mh - pad);
  scheduleDismiss();
}

function onContextMenuCapture(e: MouseEvent) {
  const t = e.target;
  if (!(t instanceof Element)) return;

  if (t.closest('.visited-tab-wrap')) return;
  if (t.closest(APP_CONTEXT_MENU_SURFACE_SELECTOR)) return;

  const editable = getEditableElement(t);
  const rawSel = document.getSelection()?.toString() ?? '';
  const inMain = !!t.closest('.app-shell-main-scroll');

  if (editable) {
    e.preventDefault();
    openAt(e, 'edit', editable, '');
    return;
  }

  if (rawSel.length > 0 && inMain) {
    e.preventDefault();
    openAt(e, 'selection', null, rawSel);
    return;
  }

  e.preventDefault();
}

onMounted(() => {
  document.addEventListener('contextmenu', onContextMenuCapture, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="menu.mode === 'edit' && menu.editable"
      class="app-context-menu-surface rounded-lg"
      role="menu"
      :aria-label="t('nav.contextMenu.ariaLabel')"
      :style="{ top: `${menu.y}px`, left: `${menu.x}px` }"
      @click.stop
      @contextmenu.prevent.stop
    >
      <v-list density="compact" class="py-1" tabindex="-1">
        <v-list-item
          role="menuitem"
          :title="t('nav.contextMenu.cut')"
          :disabled="cutDisabled"
          @click="actionCut"
        />
        <v-list-item
          role="menuitem"
          :title="t('nav.contextMenu.copy')"
          :disabled="copyDisabled"
          @click="actionCopy"
        />
        <v-list-item
          role="menuitem"
          :title="t('nav.contextMenu.paste')"
          :disabled="pasteDisabled"
          @click="actionPaste"
        />
        <v-divider class="my-1" />
        <v-list-item
          role="menuitem"
          :title="t('nav.contextMenu.selectAll')"
          :disabled="selectAllDisabled"
          @click="actionSelectAll"
        />
      </v-list>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="menu.mode === 'selection'"
      class="app-context-menu-surface rounded-lg"
      role="menu"
      :aria-label="t('nav.contextMenu.ariaLabel')"
      :style="{ top: `${menu.y}px`, left: `${menu.x}px` }"
      @click.stop
      @contextmenu.prevent.stop
    >
      <v-list density="compact" class="py-1" tabindex="-1">
        <v-list-item
          role="menuitem"
          :title="t('nav.contextMenu.copy')"
          :disabled="copyDisabled"
          @click="actionCopy"
        />
      </v-list>
    </div>
  </Teleport>
</template>

<style scoped>
.app-context-menu-surface :deep(.v-list) {
  background: transparent !important;
}

.app-context-menu-surface :deep(.v-list-item) {
  border-radius: 6px;
  margin-inline: 4px;
  min-height: 30px !important;
  padding-block: 2px !important;
}

.app-context-menu-surface :deep(.v-list-item--density-compact.v-list-item--one-line) {
  min-height: 30px !important;
}

.app-context-menu-surface :deep(.v-list-item__content) {
  padding-block: 0;
}

.app-context-menu-surface :deep(.v-list-item-title) {
  font-size: inherit;
  font-weight: 500;
  line-height: inherit;
}

.app-context-menu-surface :deep(.v-list-item:not(.v-list-item--active):hover),
.app-context-menu-surface :deep(.v-list-item:not(.v-list-item--active):focus-visible) {
  background: var(--app-on-surface-09) !important;
}

.app-context-menu-surface :deep(.v-divider) {
  margin-inline: 8px;
  border-color: var(--app-on-surface-12);
  opacity: 1;
}
</style>
