import re

from typer.testing import CliRunner

from modpack_updater.cli import app

runner = CliRunner()

# CI（如 GitHub Actions）常启用彩色输出；Rich/Click 可能在 ANSI 片段之间插入样式，
# 使 `--usercache` 等子串在原始 stdout 中不连续。断言前去掉转义序列。
_STRIP_ANSI = re.compile(r"\x1b\[[0-9;]*m")


def _plain_stdout(s: str) -> str:
    return _STRIP_ANSI.sub("", s)


def test_cli_help() -> None:
    r = runner.invoke(app, ["--help"], color=False)
    assert r.exit_code == 0
    out = _plain_stdout(r.stdout)
    assert "scan" in out
    assert "uuid-migrate" in out
    assert "world-players" in out
    assert "player-dat-info" in out
    assert "Minecraft Utilities" in out


def test_world_players_help_has_usercache_option() -> None:
    r = runner.invoke(app, ["world-players", "--help"], color=False)
    assert r.exit_code == 0
    assert "--usercache" in _plain_stdout(r.stdout)
