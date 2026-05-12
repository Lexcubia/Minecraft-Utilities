"""Minecraft Java 存档：将某一玩家 UUID 批量替换为另一 UUID（重命名相关文件 + 文本与 NBT 内容）。"""

from __future__ import annotations

import json
import os
import struct
import uuid
from collections.abc import Iterable
from pathlib import Path

from nbtlib import Compound, IntArray, List, String

from modpack_updater.nbt_dat import load_java_dat_nbt

# 仅处理明确为文本的配置类扩展名；避免误改二进制。
_TEXT_SUFFIXES = frozenset(
    {
        ".json",
        ".txt",
        ".log",
        ".mcmeta",
        ".toml",
        ".properties",
        ".yml",
        ".yaml",
        ".cfg",
        ".lang",
        ".snbt",
    }
)

# 体积极大的目录默认跳过（区块实体等；需要时可后续扩展）。
_SKIP_DIR_NAMES = frozenset({"region", "poi", "entities"})


def parse_uuid(s: str) -> uuid.UUID:
    s = s.strip()
    if len(s) == 32 and all(c in "0123456789abcdefABCDEF" for c in s):
        s = f"{s[0:8]}-{s[8:12]}-{s[12:16]}-{s[16:20]}-{s[20:32]}"
    return uuid.UUID(s)


def uuid_to_mc_int_array(u: uuid.UUID) -> tuple[int, int, int, int]:
    """与 Java 版 NBT `UUID` IntArray 一致：16 字节按 RFC 顺序拆成 4 个 big-endian int32。"""
    return struct.unpack(">iiii", u.bytes)


def mc_int_array_to_uuid(values: object) -> uuid.UUID | None:
    """解析实体/玩家 NBT 中长度为 4 的 `UUID` IntArray。"""
    if values is None:
        return None
    if isinstance(values, IntArray):
        seq = list(values)
    elif isinstance(values, (list, tuple)) and len(values) == 4:
        seq = [int(x) for x in values]
    else:
        return None
    if len(seq) != 4:
        return None
    try:
        ints = tuple(int(x) for x in seq)
    except (TypeError, ValueError):
        return None
    try:
        return uuid.UUID(bytes=struct.pack(">iiii", *ints))
    except (struct.error, ValueError):
        return None


def uuid_string_variants(u: uuid.UUID) -> tuple[str, ...]:
    """用于在 UTF-8 文本中替换的常见写法。"""
    c = str(u)
    h = c.replace("-", "")
    return (
        c.lower(),
        c.upper(),
        h.lower(),
        h.upper(),
    )


def _stem_matches_uuid(stem: str, target: uuid.UUID) -> bool:
    s = stem.replace("-", "").casefold()
    return s == str(target).replace("-", "").casefold()


def _rename_uuid_named_files(
    world: Path, old: uuid.UUID, new: uuid.UUID, dry_run: bool
) -> list[str]:
    """重命名 playerdata / advancements / stats 下以旧 UUID 为名的文件。"""
    actions: list[str] = []
    new_stem = str(new).lower()
    subdirs = [
        ("playerdata", ".dat"),
        ("advancements", ".json"),
        ("stats", ".json"),
    ]
    for rel, suffix in subdirs:
        d = world / rel
        if not d.is_dir():
            continue
        for p in sorted(d.iterdir()):
            if not p.is_file() or p.suffix.lower() != suffix:
                continue
            if not _stem_matches_uuid(p.stem, old):
                continue
            dest = d / f"{new_stem}{suffix}"
            actions.append(f"rename: {p} -> {dest}")
            if not dry_run:
                if dest.exists() and dest.resolve() != p.resolve():
                    msg = f"目标已存在，拒绝覆盖: {dest}"
                    raise FileExistsError(msg)
                p.rename(dest)
    return actions


def _replace_in_text(content: str, variants_old: tuple[str, ...], new_canonical_lower: str) -> str:
    out = content
    for o in variants_old:
        if o in out:
            out = out.replace(o, new_canonical_lower)
    return out


def _iter_text_files(world: Path) -> Iterable[Path]:
    for root, dirs, files in os.walk(world, topdown=True):
        dirs[:] = [d for d in dirs if d not in _SKIP_DIR_NAMES]
        root_path = Path(root)
        for name in files:
            p = root_path / name
            if p.suffix.lower() in _TEXT_SUFFIXES:
                yield p


def _replace_text_files(
    world: Path,
    variants_old: tuple[str, ...],
    new_canonical_lower: str,
    dry_run: bool,
) -> list[str]:
    actions: list[str] = []
    for path in _iter_text_files(world):
        try:
            raw = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if not any(o in raw for o in variants_old):
            continue
        replaced = _replace_in_text(raw, variants_old, new_canonical_lower)
        if replaced == raw:
            continue
        if path.suffix.lower() == ".json":
            try:
                json.loads(replaced)
            except json.JSONDecodeError as e:
                msg = f"替换后 JSON 无效: {path}: {e}"
                raise ValueError(msg) from e
        actions.append(f"text: {path}")
        if not dry_run:
            path.write_text(replaced, encoding="utf-8", newline="")
    return actions


def _walk_nbt_replace(
    tag: object,
    variants_old: tuple[str, ...],
    new_lower: str,
    old_ints: tuple[int, int, int, int],
    new_ints: tuple[int, int, int, int],
) -> bool:
    """原地修改 NBT；若发生修改返回 True。"""
    changed = False
    if isinstance(tag, Compound):
        for k in list(tag.keys()):
            v = tag[k]
            if isinstance(v, IntArray) and len(v) == 4:
                if tuple(int(x) for x in v) == old_ints:
                    tag[k] = IntArray(list(new_ints))
                    changed = True
                continue
            if isinstance(v, String):
                s = str(v)
                ns = _replace_in_text(s, variants_old, new_lower)
                if ns != s:
                    tag[k] = String(ns)
                    changed = True
                continue
            if isinstance(v, (Compound, List)) and _walk_nbt_replace(
                v,
                variants_old,
                new_lower,
                old_ints,
                new_ints,
            ):
                changed = True
    elif isinstance(tag, List):
        for i in range(len(tag)):
            item = tag[i]
            if isinstance(item, IntArray) and len(item) == 4:
                if tuple(int(x) for x in item) == old_ints:
                    tag[i] = IntArray(list(new_ints))
                    changed = True
                continue
            if isinstance(item, String):
                s = str(item)
                ns = _replace_in_text(s, variants_old, new_lower)
                if ns != s:
                    tag[i] = String(ns)
                    changed = True
                continue
            if isinstance(item, (Compound, List)) and _walk_nbt_replace(
                item,
                variants_old,
                new_lower,
                old_ints,
                new_ints,
            ):
                changed = True
    return changed


def _process_nbt_file(
    path: Path,
    old: uuid.UUID,
    new: uuid.UUID,
    dry_run: bool,
) -> bool:
    old_ints = uuid_to_mc_int_array(old)
    new_ints = uuid_to_mc_int_array(new)
    variants = uuid_string_variants(old)
    new_lower = str(new).lower()

    loaded = load_java_dat_nbt(path)
    if loaded is None:
        return False
    nbt_file, gzipped = loaded

    root = nbt_file
    if not _walk_nbt_replace(root, variants, new_lower, old_ints, new_ints):
        return False
    if not dry_run:
        nbt_file.save(str(path), gzipped=gzipped)
    return True


def _iter_nbt_dat_files(world: Path) -> Iterable[Path]:
    """遍历存档内 .dat（通常为 gzip+NBT）。"""
    for root, dirs, files in os.walk(world, topdown=True):
        dirs[:] = [d for d in dirs if d not in _SKIP_DIR_NAMES]
        root_path = Path(root)
        for name in files:
            if name.endswith(".dat"):
                yield root_path / name


def _replace_nbt_files(world: Path, old: uuid.UUID, new: uuid.UUID, dry_run: bool) -> list[str]:
    actions: list[str] = []
    for path in _iter_nbt_dat_files(world):
        try:
            if _process_nbt_file(path, old, new, dry_run):
                actions.append(f"nbt: {path}")
        except OSError:
            continue
    return actions


def migrate_world_uuid(
    world: Path,
    old: uuid.UUID,
    new: uuid.UUID,
    *,
    dry_run: bool = False,
) -> list[str]:
    """
    在存档根目录 `world` 下将 `old` UUID 迁移为 `new`。

    - 重命名 playerdata / advancements / stats 下与旧 UUID 同名的文件；
    - 在常见文本扩展名文件中做字符串替换；
    - 在 .dat（gzip NBT）中替换 String 内的 UUID 写法及长度为 4 的 UUID IntArray。

    不扫描 region/*.mca（区块二进制）；若需迁移区块内实体 UUID，须另做工具或手动。
    """
    if old == new:
        msg = "旧 UUID 与新 UUID 相同，无需迁移"
        raise ValueError(msg)
    world = world.resolve()
    if not world.is_dir():
        msg = f"不是目录: {world}"
        raise NotADirectoryError(msg)

    log: list[str] = []
    log.extend(_rename_uuid_named_files(world, old, new, dry_run))
    log.extend(_replace_text_files(world, uuid_string_variants(old), str(new).lower(), dry_run))
    log.extend(_replace_nbt_files(world, old, new, dry_run))
    return log


def migrate_world_uuid_batch(
    world: Path,
    pairs: list[tuple[uuid.UUID, uuid.UUID]],
    *,
    dry_run: bool = False,
) -> list[str]:
    """按顺序执行多组 UUID 替换（建议各 `from` 互不重复）。"""
    log: list[str] = []
    for old, new in pairs:
        log.extend(migrate_world_uuid(world, old, new, dry_run=dry_run))
    return log
