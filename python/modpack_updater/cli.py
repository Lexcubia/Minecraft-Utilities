from __future__ import annotations

import typer

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


def main() -> None:
    app()


if __name__ == "__main__":
    main()
