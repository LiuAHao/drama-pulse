# Scripts

这里用于承载离线处理脚本。

子目录：

- `highlight/`：高光识别与标签生成
  - 当前链路统一由 `DeepSeek` 完成剧情上下文整理、初筛和复核
- `branch/`：分支生成辅助脚本
  - 预留给 `豆包 / ARK` 分支生成链路
- `story_context/`：剧情上下文包生成流水线
  - 当前提供 `transcript -> 分集层 -> 时间线层 -> 全剧层 -> 尾集快照层 -> story_context_package` 的最小可运行闭环
  - 支持从已有 ASR JSON 直接出包，也支持从全集视频批量抽音频、转写并出包
