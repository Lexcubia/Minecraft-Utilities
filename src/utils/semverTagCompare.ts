/** 去掉首尾空白与常见 `v` 前缀 */
export function normalizeSemverString(input: string): string {
  return input.trim().replace(/^v/i, '');
}

function parseNumericParts(versionCore: string): number[] | null {
  const core = versionCore.split(/[-+]/)[0] ?? versionCore;
  const segments = core.split('.');
  const parts: number[] = [];
  for (const seg of segments) {
    const n = Number.parseInt(seg.replace(/^\D*/, '').replace(/\D.*$/, ''), 10);
    if (Number.isNaN(n)) return null;
    parts.push(n);
  }
  return parts.length ? parts : null;
}

/** 将发布 tag 与当前应用版本比较（仅比较数字段，忽略 pre-release 后缀）。 */
export function compareTagToAppVersion(
  tagName: string,
  appVersion: string,
): 'equal' | 'newer' | 'older' | 'unknown' {
  const a = normalizeSemverString(tagName);
  const b = normalizeSemverString(appVersion);
  const pa = parseNumericParts(a);
  const pb = parseNumericParts(b);
  if (!pa || !pb) return 'unknown';
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da > db ? 'newer' : 'older';
  }
  return 'equal';
}
