"""读取 Java 版存档中的 `.dat`（gzip NBT 或裸 NBT）。"""

from __future__ import annotations

import gzip
from pathlib import Path
from typing import NamedTuple

from nbtlib import File


class LoadedJavaDatNbt(NamedTuple):
    """成功解析后的 NBT 文件对象及写回时是否使用 gzip。"""

    nbt_file: File
    gzipped: bool


def load_java_dat_nbt(path: Path) -> LoadedJavaDatNbt | None:
    """
    先按 gzip 压缩 NBT 读取；失败再尝试未压缩。

    非 gzip 文件会触发 `gzip.BadGzipFile`，仍会继续尝试裸读；
    其它 `OSError`（如文件被占用）则不再尝试裸读。
    """
    try:
        nbt_file = File.load(str(path), gzipped=True)
        return LoadedJavaDatNbt(nbt_file, True)
    except gzip.BadGzipFile:
        pass
    except OSError:
        return None
    except Exception:
        pass
    try:
        nbt_file = File.load(str(path), gzipped=False)
        return LoadedJavaDatNbt(nbt_file, False)
    except Exception:
        return None
