"""uuid_migrate 单元测试。"""

from __future__ import annotations

import io
import json
import uuid
from pathlib import Path

from nbtlib import Compound, File, IntArray, String

from modpack_updater.uuid_migrate import (
    mc_int_array_to_uuid,
    migrate_world_uuid,
    parse_uuid,
    uuid_to_mc_int_array,
)


def test_parse_uuid_hex_no_dash() -> None:
    u = parse_uuid("722bdf687ef54ba5a726cc687b08edc1")
    assert str(u) == "722bdf68-7ef5-4ba5-a726-cc687b08edc1"


def test_uuid_int_array_roundtrip() -> None:
    u = uuid.UUID("722bdf68-7ef5-4ba5-a726-cc687b08edc1")
    ints = uuid_to_mc_int_array(u)
    assert len(ints) == 4
    assert all(isinstance(x, int) for x in ints)
    back = mc_int_array_to_uuid(IntArray(list(ints)))
    assert back == u


def test_migrate_renames_playerdata_and_json(tmp_path: Path) -> None:
    old = uuid.UUID("722bdf68-7ef5-4ba5-a726-cc687b08edc1")
    new = uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    world = tmp_path / "world"
    pd = world / "playerdata"
    pd.mkdir(parents=True)
    adv = world / "advancements"
    adv.mkdir()
    old_stem = str(old).lower()
    (pd / f"{old_stem}.dat").write_bytes(b"not valid nbt gzip skip")
    (adv / f"{old_stem}.json").write_text(
        json.dumps({"uuid": str(old), "x": 1}),
        encoding="utf-8",
    )

    log = migrate_world_uuid(world, old, new, dry_run=False)
    assert any("rename" in x for x in log)
    assert not (pd / f"{old_stem}.dat").exists()
    assert (pd / f"{str(new).lower()}.dat").exists()
    data = json.loads((adv / f"{str(new).lower()}.json").read_text(encoding="utf-8"))
    assert data["uuid"] == str(new).lower()


def test_migrate_nbt_string_and_int_array(tmp_path: Path) -> None:
    old = uuid.UUID("722bdf68-7ef5-4ba5-a726-cc687b08edc1")
    new = uuid.UUID("11111111-2222-3333-4444-555555555555")
    world = tmp_path / "world"
    world.mkdir()
    root = Compound(
        {
            "Player": Compound(
                {
                    "UUID": IntArray(list(uuid_to_mc_int_array(old))),
                    "note": String(str(old)),
                },
            ),
        },
    )
    nbt_file = File(root)
    buf = io.BytesIO()
    nbt_file.save(buf, gzipped=True)
    (world / "level.dat").write_bytes(buf.getvalue())

    migrate_world_uuid(world, old, new, dry_run=False)
    loaded = File.load(str(world / "level.dat"), gzipped=True)
    p = loaded["Player"]
    assert tuple(int(x) for x in p["UUID"]) == uuid_to_mc_int_array(new)
    assert str(p["note"]) == str(new).lower()


def test_migrate_dry_run_no_write(tmp_path: Path) -> None:
    old = uuid.UUID("722bdf68-7ef5-4ba5-a726-cc687b08edc1")
    new = uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    world = tmp_path / "world"
    pd = world / "playerdata"
    pd.mkdir(parents=True)
    old_stem = str(old).lower()
    p = pd / f"{old_stem}.dat"
    p.write_text("x", encoding="utf-8")

    migrate_world_uuid(world, old, new, dry_run=True)
    assert p.exists()
    assert p.name == f"{old_stem}.dat"
