from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Annotated

import typer

from modpack_updater.nbt_tree import inspect_dat_file_json, list_world_dat_files_json
from modpack_updater.uuid_migrate import (
    migrate_world_uuid,
    migrate_world_uuid_batch,
    parse_uuid,
)
from modpack_updater.world_players import inspect_player_dat_json, list_world_players_json

app = typer.Typer(no_args_is_help=True, help="Minecraft Utilities — engine CLI (work in progress)")


@app.command()
def scan() -> None:
    """Scan a pack or instance directory (not implemented)."""
    typer.echo("scan: not implemented")


@app.command()
def plan() -> None:
    """Build a change plan from manifests (not implemented)."""
    typer.echo("plan: not implemented")


@app.command()
def apply() -> None:
    """Apply a generated plan (not implemented)."""
    typer.echo("apply: not implemented")


@app.command("uuid-migrate")
def uuid_migrate(
    world: Annotated[
        Path,
        typer.Argument(
            ...,
            exists=True,
            file_okay=False,
            dir_okay=True,
            help="存档根目录（内含 level.dat、playerdata 等）",
        ),
    ],
    old_uuid: Annotated[
        str,
        typer.Option(..., "--from", "-f", help="旧玩家 UUID（可带或不带连字符）"),
    ],
    new_uuid: Annotated[
        str,
        typer.Option(..., "--to", "-t", help="新玩家 UUID（可带或不带连字符）"),
    ],
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", help="仅列出将执行的操作，不写盘"),
    ] = False,
) -> None:
    """将存档内旧 UUID 批量替换为新 UUID（重命名相关文件 + 文本与 .dat NBT）。"""
    old = parse_uuid(old_uuid)
    new = parse_uuid(new_uuid)
    actions = migrate_world_uuid(world, old, new, dry_run=dry_run)
    if not actions:
        typer.echo("未发现需要替换的内容（或路径下无匹配文件）。")
        raise typer.Exit(0)
    for line in actions:
        typer.echo(line)
    typer.echo(f"共 {len(actions)} 项。" + ("（dry-run，未写入）" if dry_run else ""))


@app.command("world-players")
def world_players(
    world: Annotated[
        Path,
        typer.Argument(
            ...,
            exists=True,
            file_okay=False,
            dir_okay=True,
            help="存档根目录",
        ),
    ],
    usercache: Annotated[
        Path | None,
        typer.Option(
            "--usercache",
            exists=True,
            file_okay=True,
            dir_okay=False,
            help="显示名仅从此 usercache.json 解析（省略则尝试存档上一级的 usercache.json）",
        ),
    ] = None,
) -> None:
    """输出 playerdata 列表；玩家显示名仅从 usercache.json 映射。"""
    typer.echo(list_world_players_json(world, usercache=usercache))


@app.command("world-list-dats")
def world_list_dats(
    world: Annotated[
        Path,
        typer.Argument(
            ...,
            exists=True,
            file_okay=False,
            dir_okay=True,
            help="存档根目录",
        ),
    ],
) -> None:
    """列出存档内可读的 .dat 文件（跳过 region/poi/entities）。"""
    typer.echo(list_world_dat_files_json(world))


@app.command("nbt-inspect")
def nbt_inspect(
    dat: Annotated[
        Path,
        typer.Argument(
            ...,
            exists=True,
            file_okay=True,
            dir_okay=False,
            help="Java NBT .dat 文件路径",
        ),
    ],
) -> None:
    """读取 .dat 并输出完整 NBT 树 JSON（只读）。"""
    typer.echo(inspect_dat_file_json(dat))


@app.command("player-dat-info")
def player_dat_info(
    dat: Annotated[
        Path,
        typer.Argument(
            ...,
            exists=True,
            file_okay=True,
            dir_okay=False,
            help="playerdata 下单个 .dat 或其它 Java NBT .dat 文件路径",
        ),
    ],
) -> None:
    """读取单个 .dat（NBT），输出 JSON：是否解析成功、DataVersion、可读名、文件名推断的 UUID 等。"""
    typer.echo(inspect_player_dat_json(dat))


@app.command("uuid-migrate-batch")
def uuid_migrate_batch_cmd(
    world: Annotated[
        Path,
        typer.Argument(
            ...,
            exists=True,
            file_okay=False,
            dir_okay=True,
            help="存档根目录",
        ),
    ],
    pairs_file: Annotated[
        Path,
        typer.Option(..., "--pairs-file", help='JSON 数组，每项 {"from":"旧","to":"新"}'),
    ],
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", help="仅列出将执行的操作，不写盘"),
    ] = False,
) -> None:
    """按映射文件批量执行 UUID 迁移。"""
    raw = json.loads(pairs_file.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        typer.echo("pairs JSON 须为数组", err=True)
        raise typer.Exit(1)
    pairs: list[tuple[uuid.UUID, uuid.UUID]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        pairs.append((parse_uuid(str(item["from"])), parse_uuid(str(item["to"]))))
    if not pairs:
        typer.echo("映射为空", err=True)
        raise typer.Exit(1)
    actions = migrate_world_uuid_batch(world, pairs, dry_run=dry_run)
    if not actions:
        typer.echo("未发现需要替换的内容。")
        raise typer.Exit(0)
    for line in actions:
        typer.echo(line)
    typer.echo(f"共 {len(actions)} 项。" + ("（dry-run，未写入）" if dry_run else ""))


def _ensure_utf8_stdio() -> None:
    """避免 Windows 控制台非 UTF-8 时 Typer 输出中文被外层按 UTF-8 读成乱码。"""
    import sys

    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except (OSError, ValueError, TypeError):
                pass


def main() -> None:
    _ensure_utf8_stdio()
    app()


if __name__ == "__main__":
    main()
