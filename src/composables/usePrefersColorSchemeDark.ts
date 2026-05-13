import { onMounted, onUnmounted, ref, type Ref } from 'vue';

/** 跟随系统 `prefers-color-scheme: dark`，并在系统主题变化时更新 */
export function usePrefersColorSchemeDark(): Ref<boolean> {
  const prefersDark = ref(false);
  let mql: MediaQueryList | null = null;

  const sync = () => {
    if (mql) prefersDark.value = mql.matches;
  };

  onMounted(() => {
    mql = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDark.value = mql.matches;
    mql.addEventListener('change', sync);
  });

  onUnmounted(() => {
    mql?.removeEventListener('change', sync);
    mql = null;
  });

  return prefersDark;
}
