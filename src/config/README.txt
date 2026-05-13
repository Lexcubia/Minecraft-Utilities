Minecraft Utilities — 源码内 `settings.json`

供前端合并默认界面选项；运行时设置保存在 WebView 的 localStorage，不由本目录写磁盘。

便携 / 解压运行：应用仅在数据根下维护 `logs/`（含 `app.log`）；若与主程序同目录不可写，则数据根回退到本机应用数据目录。
