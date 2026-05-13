function tryParseObject(raw: string | null | undefined): Record<string, unknown> | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (v !== null && typeof v === 'object' && !Array.isArray(v))
      return v as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function isNonEmptySettingsObjectJson(raw: string): boolean {
  const o = tryParseObject(raw);
  return !!o && Object.keys(o).length > 0;
}

/**
 * 决定启动时用于 `mergeDiskAppSettingsJson` 的原始 JSON。
 * 磁盘与 localStorage 均有效时做浅合并（**localStorage 覆盖磁盘同名字段**），避免防抖写盘未完成时磁盘仍为上一次的旧数据。
 */
export function resolveSettingsBootstrapJson(
  fileContent: string | null | undefined,
  localStorageContent: string | null | undefined,
): string {
  const disk = tryParseObject(fileContent);
  const ls = tryParseObject(localStorageContent);
  const dk = disk ? Object.keys(disk).length : 0;
  const lk = ls ? Object.keys(ls).length : 0;
  if (lk > 0 && ls) {
    if (dk > 0 && disk) {
      return JSON.stringify({ ...disk, ...ls });
    }
    return JSON.stringify(ls);
  }
  if (dk > 0 && disk) {
    return JSON.stringify(disk);
  }
  return '{}';
}

/** @internal 供测试或诊断：磁盘是否尚无可用设置对象 */
export function isDiskSettingsEmptyOrInvalid(fileContent: string | null | undefined): boolean {
  const f = (fileContent ?? '').trim();
  if (!f) return true;
  return !isNonEmptySettingsObjectJson(f);
}
