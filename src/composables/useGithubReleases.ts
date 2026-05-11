import { fetchGithubReleasesList } from '@/api/githubReleases';
import { useSettingsStore } from '@/stores/settings';
import type { GitHubRelease } from '@/types/github-release';
import { computed, ref } from 'vue';

export function useGithubReleases() {
  const settings = useSettingsStore();
  const releases = ref<GitHubRelease[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const filteredReleases = computed(() => {
    if (settings.updateChannel === 'beta') return releases.value;
    return releases.value.filter((r) => !r.prerelease);
  });

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      releases.value = await fetchGithubReleasesList();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      releases.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { releases, filteredReleases, loading, error, load };
}
