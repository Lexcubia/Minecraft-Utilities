"""从存档 `playerdata` 列出玩家。

条目由 `.dat` 文件名决定 UUID；显示名仅从指定 `usercache.json` 映射。
"""

from __future__ import annotations

import json
from pathlib import Path

from nbtlib import Compound, String

from modpack_updater.nbt_dat import load_java_dat_nbt
from modpack_updater.uuid_migrate import parse_uuid


def _coerce_nbt_string(value: object) -> str | None:
    """将 NBT 字符串标签（或已解包为 str 的值）转为显示用文本。"""
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return s or None
    if isinstance(value, String):
        s = str(value).strip()
        return s or None
    unpack = getattr(value, "unpack", None)
    if callable(unpack):
        try:
            u = unpack()
        except Exception:
            u = None
        if isinstance(u, str):
            s = u.strip()
            return s or None
    return None


def _string_at_path(root: Compound, keys: tuple[str, ...]) -> str | None:
    """沿路径读取末端字符串；任一层缺失或非 Compound 则返回 None。"""
    cur: object = root
    for k in keys:
        if not isinstance(cur, Compound) or k not in cur:
            return None
        cur = cur[k]
    return _coerce_nbt_string(cur)


def _player_display_name(root: Compound) -> str | None:
    """从玩家 NBT 根 Compound 猜测显示名（供 `inspect_player_dat` 调试；列表界面不用）。"""
    paths: tuple[tuple[str, ...], ...] = (
        ("bukkit", "lastKnownName"),
        ("Bukkit", "lastKnownName"),
        ("Bukkit", "LastKnownName"),
        ("Paper", "LastKnownName"),
        ("Paper", "lastKnownName"),
        ("paper", "lastKnownName"),
        ("Spigot", "lastKnownName"),
        ("spigot", "lastKnownName"),
        ("forge", "PlayerPersisted", "PlayerLastName"),
        ("lastKnownName",),
        ("LastKnownName",),
        ("Username",),
        ("username",),
        ("PlayerName",),
        ("playerName",),
        ("name",),
    )
    for keys in paths:
        s = _string_at_path(root, keys)
        if s:
            return s
    try:
        cn = root.get("CustomName")
        s = _coerce_nbt_string(cn)
        if s and s not in ('""', "''"):
            quoted = (s.startswith('"') and s.endswith('"')) or (
                s.startswith("'") and s.endswith("'")
            )
            if quoted:
                s = s[1:-1]
            return s or None
    except (KeyError, TypeError):
        pass
    return None


def load_usercache_uuid_map(path: Path) -> dict[str, str]:
    """读取官方格式的 `usercache.json`（`[{uuid,name,...}]`）为 lower UUID → 显示名。"""
    return _load_uuid_name_map_from_json_file(path)


def _load_uuid_name_map_from_json_file(path: Path) -> dict[str, str]:
    """解析 `usercache.json` 风格列表。"""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, list):
        return {}
    out: dict[str, str] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        nu, nm = item.get("uuid"), item.get("name")
        if not isinstance(nm, str) or not nm.strip():
            continue
        if not isinstance(nu, str):
            continue
        try:
            uid = str(parse_uuid(nu)).lower()
        except ValueError:
            continue
        out[uid] = nm.strip()
    return out


def _data_version(root: Compound) -> int | None:
    dv = root.get("DataVersion")
    if dv is None:
        return None
    try:
        return int(dv)
    except (TypeError, ValueError):
        return None


def list_world_players(world: Path, *, usercache: Path | None = None) -> list[dict[str, object]]:
    """
    返回 `[{"uuid": "...", "name": "...", "read_ok": bool, "data_version": int|null}]`。

    列表成员与 `playerdata/*.dat` 一一对应；`name` 仅由 `usercache.json` 中同 UUID 项给出。
    未传 `usercache` 时，若存在 `world.parent / "usercache.json"` 则用作 CLI 回退。
    """
    world = world.resolve()
    pd = world / "playerdata"
    if not pd.is_dir():
        return []

    uuid_names: dict[str, str] = {}
    if usercache is not None:
        uc = usercache.resolve()
        if uc.is_file():
            uuid_names.update(_load_uuid_name_map_from_json_file(uc))
    else:
        fallback = world.parent / "usercache.json"
        if fallback.is_file():
            uuid_names.update(_load_uuid_name_map_from_json_file(fallback))

    out: list[dict[str, object]] = []
    for p in sorted(pd.glob("*.dat")):
        stem = p.stem
        try:
            uid = parse_uuid(stem)
        except ValueError:
            continue
        uuid_lower = str(uid).lower()
        data_version: int | None = None
        loaded = load_java_dat_nbt(p)
        read_ok = loaded is not None
        if loaded is not None:
            root = loaded.nbt_file
            if isinstance(root, Compound):
                data_version = _data_version(root)
        name = uuid_names.get(uuid_lower, "")
        out.append(
            {
                "uuid": uuid_lower,
                "name": name,
                "read_ok": read_ok,
                "data_version": data_version,
            },
        )
    return out


def list_world_players_json(world: Path, usercache: Path | None = None) -> str:
    return json.dumps(
        list_world_players(world, usercache=usercache),
        ensure_ascii=False,
        indent=2,
    )


def inspect_player_dat(path: Path) -> dict[str, object]:
    """
    读取单个 `*.dat`（gzip 或裸 NBT），输出摘要（供 CLI / 调试）。

    若文件名为合法 UUID，则解析为 `uuid_from_filename`；否则仅报告解析错误。
    """
    path = path.resolve()
    stem = path.stem
    uuid_from_filename: str | None = None
    uuid_parse_error: str | None = None
    try:
        uid = parse_uuid(stem)
        uuid_from_filename = str(uid).lower()
    except ValueError as e:
        uuid_parse_error = str(e)

    loaded = load_java_dat_nbt(path)
    read_ok = loaded is not None
    name = ""
    data_version: int | None = None
    if loaded is not None:
        root = loaded.nbt_file
        if isinstance(root, Compound):
            disp = _player_display_name(root)
            if disp:
                name = disp
            data_version = _data_version(root)

    return {
        "path": str(path),
        "stem": stem,
        "uuid_from_filename": uuid_from_filename,
        "uuid_parse_error": uuid_parse_error,
        "read_ok": read_ok,
        "name": name,
        "data_version": data_version,
    }


def inspect_player_dat_json(path: Path) -> str:
    return json.dumps(inspect_player_dat(path), ensure_ascii=False, indent=2)
