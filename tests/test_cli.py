from typer.testing import CliRunner

from modpack_updater.cli import app

runner = CliRunner()


def test_cli_help() -> None:
    r = runner.invoke(app, ["--help"])
    assert r.exit_code == 0
    assert "scan" in r.stdout
    assert "Minecraft Utilities" in r.stdout
