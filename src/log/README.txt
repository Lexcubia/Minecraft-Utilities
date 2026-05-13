Minecraft Utilities — 应用目录下的日志（logs）

应用会将运行日志追加写入 app.log（UTF-8 文本）；默认与主程序同目录，不可写时与 configs 同策略。
单文件过大时会自动轮转：当前文件保存为 app.log.prev 并新建 app.log。

