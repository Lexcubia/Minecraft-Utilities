"""将 Java 版 `.dat`（NBT）转为前端可渲染的 JSON 树（只读）。"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from nbtlib import (
    Byte,
    ByteArray,
    Compound,
    Double,
    Float,
    Int,
    IntArray,
    List,
    Long,
    LongArray,
    Short,
    String,
)
from nbtlib.tag import Base

from modpack_updater.nbt_dat import load_java_dat_nbt
from modpack_updater.uuid_migrate import mc_int_array_to_uuid
from modpack_updater.world_dat_paths import iter_world_dat_files

# List / 数组超过此长度时截断子项，避免 UI 卡死。
MAX_CHILDREN = 256


def _tag_type_name(tag: Base) -> str:
    return type(tag).__name__


def _scalar_value(tag: Base) -> Any:
    if isinstance(tag, (Byte, Short, Int, Long)):
        return int(tag)
    if isinstance(tag, (Float, Double)):
        return float(tag)
    if isinstance(tag, String):
        return str(tag)
    return str(tag)


def _array_preview(tag: ByteArray | IntArray | LongArray) -> dict[str, Any]:
    name = _tag_type_name(tag)
    seq = list(tag)
    total = len(seq)
    truncated = total > MAX_CHILDREN
    slice_end = MAX_CHILDREN if truncated else total
    children: list[dict[str, Any]] = []
    for i, item in enumerate(seq[:slice_end]):
        if isinstance(tag, ByteArray):
            val = int(item)
        elif isinstance(tag, LongArray):
            val = int(item)
        else:
            val = int(item)
        children.append(
            {
                "name": f"[{i}]",
                "tag": "Int" if name != "ByteArray" else "Byte",
                "path": f"[{i}]",
                "value": val,
            },
        )
    out: dict[str, Any] = {
        "name": "",
        "tag": name,
        "path": "",
        "children": children,
        "total_count": total,
    }
    if truncated:
        out["truncated"] = True
    if name == "IntArray" and total == 4:
        uid = mc_int_array_to_uuid(seq)
        if uid is not None:
            out["display"] = str(uid)
    return out


def _node_from_tag(tag: Base, name: str, path: str) -> dict[str, Any]:
    node: dict[str, Any] = {
        "name": name,
        "tag": _tag_type_name(tag),
        "path": path,
    }

    if isinstance(tag, Compound):
        children: list[dict[str, Any]] = []
        keys = list(tag.keys())
        total = len(keys)
        truncated = total > MAX_CHILDREN
        for key in keys[: MAX_CHILDREN if truncated else total]:
            child_path = f"{path}.{key}" if path else key
            children.append(_node_from_tag(tag[key], key, child_path))
        node["children"] = children
        if truncated:
            node["truncated"] = True
            node["total_count"] = total
        return node

    if isinstance(tag, List):
        items = list(tag)
        total = len(items)
        truncated = total > MAX_CHILDREN
        children = []
        for i, item in enumerate(items[: MAX_CHILDREN if truncated else total]):
            child_path = f"{path}[{i}]" if path else f"[{i}]"
            children.append(_node_from_tag(item, f"[{i}]", child_path))
        node["children"] = children
        if truncated:
            node["truncated"] = True
            node["total_count"] = total
        return node

    if isinstance(tag, (ByteArray, IntArray, LongArray)):
        arr = _array_preview(tag)
        node["children"] = arr["children"]
        if arr.get("truncated"):
            node["truncated"] = True
            node["total_count"] = arr["total_count"]
        if arr.get("display"):
            node["display"] = arr["display"]
        return node

    node["value"] = _scalar_value(tag)
    if isinstance(tag, String) and len(node["value"]) > 120:
        node["display"] = node["value"][:117] + "..."
    return node


def nbt_root_to_tree(root: Base) -> dict[str, Any]:
    """将 NBT 根标签转为树（Java .dat 根一般为 Compound / File）。"""
    return _node_from_tag(root, "", "")


def _data_version(root: Compound) -> int | None:
    if "DataVersion" in root:
        try:
            return int(root["DataVersion"])
        except (TypeError, ValueError):
            return None
    return None


def list_world_dat_files(world: Path) -> list[dict[str, object]]:
    """列出存档内 `.dat` 的相对路径与大小。"""
    world = world.resolve()
    if not world.is_dir():
        msg = f"不是目录: {world}"
        raise NotADirectoryError(msg)
    out: list[dict[str, object]] = []
    for path in sorted(iter_world_dat_files(world)):
        try:
            rel = path.relative_to(world).as_posix()
        except ValueError:
            rel = str(path)
        try:
            size = path.stat().st_size
        except OSError:
            size = 0
        readable = load_java_dat_nbt(path) is not None
        out.append(
            {
                "relative_path": rel,
                "size": size,
                "read_ok": readable,
            },
        )
    return out


def list_world_dat_files_json(world: Path) -> str:
    return json.dumps(list_world_dat_files(world), ensure_ascii=False, indent=2)


def inspect_dat_file(path: Path) -> dict[str, object]:
    """读取单个 `.dat`，返回元数据与 NBT 树 JSON。"""
    path = path.resolve()
    try:
        file_size = path.stat().st_size
    except OSError:
        file_size = 0

    loaded = load_java_dat_nbt(path)
    if loaded is None:
        return {
            "path": str(path),
            "read_ok": False,
            "gzipped": None,
            "file_size": file_size,
            "data_version": None,
            "tree": None,
            "error": "无法解析为 Java NBT .dat（gzip 或裸 NBT）",
        }

    nbt_file, gzipped = loaded
    root = nbt_file
    data_version: int | None = None
    if isinstance(root, Compound):
        data_version = _data_version(root)

    try:
        tree = nbt_root_to_tree(root)
    except Exception as e:
        return {
            "path": str(path),
            "read_ok": True,
            "gzipped": gzipped,
            "file_size": file_size,
            "data_version": data_version,
            "tree": None,
            "error": str(e),
        }

    return {
        "path": str(path),
        "read_ok": True,
        "gzipped": gzipped,
        "file_size": file_size,
        "data_version": data_version,
        "tree": tree,
        "error": None,
    }


def inspect_dat_file_json(path: Path) -> str:
    return json.dumps(inspect_dat_file(path), ensure_ascii=False, indent=2)
