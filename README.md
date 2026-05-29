# Drama Pulse

Drama Pulse 是一个基于短剧剧情高光的互动播放器项目，目标是在 Android 端实现：

- 短剧播放与基础播控
- 高光点触发互动
- 历史互动沉淀回流
- 尾集固定分支与自定义分支
- 本地服务端与本地 Web 管理后台闭环

## 目录结构

```text
android-app/      Android 客户端
server/           本地服务端
admin-web/        本地 Web 管理后台
scripts/          离线处理脚本
data/             导出文件、seed 辅助数据
server/data/      服务端运行库与测试库
assets/           封面、分支结果、特效资源
videos/           本地原始视频资源
docs/             产品、技术、排期等文档
config/           配置模板
```

说明：

- 默认运行数据库是 `server/data/app.db`
- 测试数据库是 `server/data/test.app.db`
- 根目录 `data/` 主要放导出结果和 seed 辅助文件，不是服务端当前运行库

## 文档

- [产品方案初稿](/Users/a0000/Desktop/项目文件/drama-pulse/docs/产品方案初稿.md)
- [技术方案初稿](/Users/a0000/Desktop/项目文件/drama-pulse/docs/技术方案初稿.md)

## 当前阶段

当前仓库已完成：

- 产品方案冻结
- 技术方案初稿
- 项目结构初始化

下一步建议：

- 初始化服务端工程
- 初始化管理后台工程
- 初始化 Android 工程
- 补充数据库与 API 详细设计
