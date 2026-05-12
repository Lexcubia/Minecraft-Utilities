from __future__ import annotations

import json
from pathlib import Path

from nbtlib import Compound, File, Int, String

from modpack_updater.nbt_dat import load_java_dat_nbt
from modpack_updater.world_players import (
    _player_display_name,
    inspect_player_dat,
    list_world_players,
)


def test_load_java_dat_gzip(tmp_path: Path) -> None:
    uid = "aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee"
    p = tmp_path / f"{uid}.dat"
    root = Compound(
        {
            "DataVersion": Int(4189),
            "bukkit": Compound({"lastKnownName": String("TestPlayer")}),
        },
    )
    File(root).save(str(p), gzipped=True)

    loaded = load_java_dat_nbt(p)
    assert loaded is not None
    assert loaded.gzipped is True
    assert int(loaded.nbt_file["DataVersion"]) == 4189


def test_list_world_players_reads_dat_flags(tmp_path: Path) -> None:
    world = tmp_path / "w"
    pd = world / "playerdata"
    pd.mkdir(parents=True)
    uid = "bbbbbbbb-bbbb-4ccc-bddd-ffffffffffff"
    p = pd / f"{uid}.dat"
    File(Compound({"DataVersion": Int(3333)})).save(str(p), gzipped=True)

    rows = list_world_players(world, usercache=None)
    assert len(rows) == 1
    r = rows[0]
    assert r["uuid"] == uid.lower()
    assert r["read_ok"] is True
    assert r["data_version"] == 3333
    assert r["name"] == ""


def test_inspect_player_dat(tmp_path: Path) -> None:
    uid = "cccccccc-cccc-4ccc-accc-cccccccccccc"
    p = tmp_path / f"{uid}.dat"
    File(
        Compound(
            {
                "DataVersion": Int(1),
                "Paper": Compound({"LastKnownName": String("PaperName")}),
            },
        ),
    ).save(str(p), gzipped=True)

    info = inspect_player_dat(p)
    assert info["read_ok"] is True
    assert info["uuid_from_filename"] == uid.lower()
    assert info["name"] == "PaperName"
    assert info["data_version"] == 1


def test_list_world_players_usercache_name(tmp_path: Path) -> None:
    server = tmp_path / "srv"
    world = server / "world"
    pd = world / "playerdata"
    pd.mkdir(parents=True)
    uid = "dddddddd-dddd-4ddd-addd-dddddddddddd"
    File(Compound({"DataVersion": Int(1)})).save(str(pd / f"{uid}.dat"), gzipped=True)
    uc = server / "usercache.json"
    uc.write_text(
        json.dumps(
            [{"name": "CachedPlayer", "uuid": uid, "expiresOn": "1970-01-01 00:00:00 Z"}],
        ),
        encoding="utf-8",
    )
    rows = list_world_players(world, usercache=uc)
    assert len(rows) == 1
    assert rows[0]["name"] == "CachedPlayer"


def test_list_world_players_name_only_usercache_not_nbt(tmp_path: Path) -> None:
    server = tmp_path / "srv2"
    world = server / "world"
    pd = world / "playerdata"
    pd.mkdir(parents=True)
    uid = "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee"
    File(
        Compound(
            {
                "DataVersion": Int(2),
                "bukkit": Compound({"lastKnownName": String("FromNbt")}),
            },
        ),
    ).save(str(pd / f"{uid}.dat"), gzipped=True)
    uc = server / "usercache.json"
    uc.write_text(
        json.dumps([{"name": "FromCache", "uuid": uid, "expiresOn": "1970-01-01 00:00:00 Z"}]),
        encoding="utf-8",
    )
    rows = list_world_players(world, usercache=uc)
    assert rows[0]["name"] == "FromCache"


def test_player_display_name_bukkit_lastknown_camel() -> None:
    root = Compound({"Bukkit": Compound({"LastKnownName": String("BukkitCamel")})})
    assert _player_display_name(root) == "BukkitCamel"
