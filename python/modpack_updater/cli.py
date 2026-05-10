from __future__ import annotations

import typer

app = typer.Typer(no_args_is_help=True, help="Minecraft 整合包升级 CLI（开发中）")


@app.command()
def scan() -> None:
    """扫描整合包目录（尚未实现）。"""
    typer.echo("scan: 尚未实现")


@app.command()
def plan() -> None:
    """生成升级计划（尚未实现）。"""
    typer.echo("plan: 尚未实现")


@app.command()
def apply() -> None:
    """应用升级计划（尚未实现）。"""
    typer.echo("apply: 尚未实现")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
