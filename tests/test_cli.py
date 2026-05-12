from typer.testing import CliRunner

from modpack_updater.cli import app

runner = CliRunner()


def test_cli_help() -> None:
    r = runner.invoke(app, ["--help"])
    assert r.exit_code == 0
    assert "scan" in r.stdout
    assert "uuid-migrate" in r.stdout
    assert "world-players" in r.stdout
    assert "player-dat-info" in r.stdout
    assert "Minecraft Utilities" in r.stdout


def test_world_players_help_has_usercache_option() -> None:
    r = runner.invoke(app, ["world-players", "--help"])
    assert r.exit_code == 0
    assert "--usercache" in r.stdout
