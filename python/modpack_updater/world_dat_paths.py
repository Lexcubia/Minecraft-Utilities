"""遍历 Minecraft Java 存档内的 `.dat` 文件路径（共享 skip 规则）。"""

from __future__ import annotations

import os
from collections.abc import Iterable
from pathlib import Path

# 体积极大的目录默认跳过（区块等；与 uuid_migrate 一致）。
SKIP_DIR_NAMES = frozenset({"region", "poi", "entities"})


def iter_world_dat_files(world: Path) -> Iterable[Path]:
    """遍历存档根目录下所有 `.dat`（跳过 region/poi/entities）。"""
    world = world.resolve()
    for root, dirs, files in os.walk(world, topdown=True):
        dirs[:] = [d for d in dirs if d not in SKIP_DIR_NAMES]
        root_path = Path(root)
        for name in files:
            if name.endswith(".dat"):
                yield root_path / name
