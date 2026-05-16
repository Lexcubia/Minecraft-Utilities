from __future__ import annotations

import json
import struct
import uuid
from pathlib import Path

from nbtlib import Byte, Compound, File, Int, IntArray, List, String

from modpack_updater.nbt_dat import load_java_dat_nbt
from modpack_updater.nbt_tree import (
    inspect_dat_file,
    list_world_dat_files,
    list_world_dat_files_json,
    nbt_root_to_tree,
)


def test_nbt_tree_compound_and_scalars() -> None:
    root = Compound(
        {
            "DataVersion": Int(4189),
            "hello": String("world"),
            "flag": Byte(1),
        },
    )
    tree = nbt_root_to_tree(root)
    assert tree["tag"] == "Compound"
    names = [c["name"] for c in tree["children"]]
    assert "DataVersion" in names
    dv = next(c for c in tree["children"] if c["name"] == "DataVersion")
    assert dv["value"] == 4189


def test_nbt_tree_uuid_int_array_display() -> None:
    u = uuid.UUID("aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee")
    ints = struct.unpack(">iiii", u.bytes)
    root = Compound({"UUID": IntArray(list(ints))})
    tree = nbt_root_to_tree(root)
    uuid_node = next(c for c in tree["children"] if c["name"] == "UUID")
    assert uuid_node.get("display") == str(u)


def test_nbt_tree_list_truncation() -> None:
    root = Compound({"items": List([Int(i) for i in range(300)])})
    tree = nbt_root_to_tree(root)
    items = next(c for c in tree["children"] if c["name"] == "items")
    assert items["truncated"] is True
    assert items["total_count"] == 300
    assert len(items["children"]) == 256


def test_inspect_dat_file_gzip(tmp_path: Path) -> None:
    p = tmp_path / "level.dat"
    File(Compound({"DataVersion": Int(1), "LevelName": String("Test")})).save(
        str(p),
        gzipped=True,
    )
    info = inspect_dat_file(p)
    assert info["read_ok"] is True
    assert info["gzipped"] is True
    assert info["data_version"] == 1
    assert info["tree"] is not None
    assert info["error"] is None


def test_inspect_dat_file_raw_nbt(tmp_path: Path) -> None:
    p = tmp_path / "raw.dat"
    File(Compound({"DataVersion": Int(2)})).save(str(p), gzipped=False)
    loaded = load_java_dat_nbt(p)
    assert loaded is not None
    assert loaded.gzipped is False
    info = inspect_dat_file(p)
    assert info["read_ok"] is True
    assert info["gzipped"] is False


def test_list_world_dat_files_skips_region(tmp_path: Path) -> None:
    world = tmp_path / "w"
    world.mkdir()
    File(Compound({"DataVersion": Int(1)})).save(str(world / "level.dat"), gzipped=True)
    reg = world / "region"
    reg.mkdir()
    File(Compound({})).save(str(reg / "ignored.dat"), gzipped=True)
    pd = world / "playerdata"
    pd.mkdir()
    File(Compound({})).save(str(pd / "a.dat"), gzipped=True)

    rows = list_world_dat_files(world)
    rels = {r["relative_path"] for r in rows}
    assert "level.dat" in rels
    assert "playerdata/a.dat" in rels
    assert not any("region" in r for r in rels)


def test_list_world_dat_files_json_roundtrip(tmp_path: Path) -> None:
    world = tmp_path / "w2"
    world.mkdir()
    File(Compound({})).save(str(world / "level.dat"), gzipped=True)
    parsed = json.loads(list_world_dat_files_json(world))
    assert len(parsed) == 1
