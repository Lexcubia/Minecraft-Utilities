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
 * Tauri 下以磁盘文件为唯一真源：仅当磁盘为空/损坏时，才回退到 localStorage（历史版本迁移）。
 */
export function resolveSettingsBootstrapJson(
  fileContent: string | null | undefined,
  localStorageContent: string | null | undefined,
): string {
  const disk = tryParseObject(fileContent);
  const ls = tryParseObject(localStorageContent);
  const dk = disk ? Object.keys(disk).length : 0;
  const lk = ls ? Object.keys(ls).length : 0;
  if (dk > 0 && disk) {
    return JSON.stringify(disk);
  }
  if (lk > 0 && ls) {
    return JSON.stringify(ls);
  }
  return '{}';
}

/** @internal 供测试或诊断：磁盘是否尚无可用设置对象 */
export function isDiskSettingsEmptyOrInvalid(fileContent: string | null | undefined): boolean {
  const f = (fileContent ?? '').trim();
  if (!f) return true;
  return !isNonEmptySettingsObjectJson(f);
}
