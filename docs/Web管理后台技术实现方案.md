# Drama Pulse Web 管理后台技术实现方案

## 1. 文档目的

本文档基于 [技术方案初稿.md](/Users/a0000/Desktop/项目文件/drama-pulse/docs/技术方案初稿.md) 与 [开发顺序与任务拆解初稿.md](/Users/a0000/Desktop/项目文件/drama-pulse/docs/开发顺序与任务拆解初稿.md)，单独拆出 `admin-web/` 的技术实现方案，作为本地 Web 管理后台的页面开发、接口对接、状态管理和验收依据。

本文档目标：

- 明确后台不是“简易页”，而是完整本地管理后台
- 冻结后台页面结构、路由和组件分层
- 明确每个页面的职责、依赖接口和关键交互
- 明确鉴权、查询、表单、分页、筛选和重试策略
- 支撑其他 agent 并行开发后台页面

## 2. 后台定位与边界

### 2.1 后台定位

后台面向项目开发者和内容运营者，承担以下职责：

- 资源配置
- 高光标签查看与修正
- 按内容维度查看播放互动数据
- 分支任务内容审核与执行排障
- 演示数据初始化与重置

### 2.2 后台不承担的内容

- 普通用户观看功能
- Android 客户端逻辑
- 实时播放预览器
- 大规模权限系统

### 2.3 第一版必须坚持的边界

- 只做本地 Web 管理后台
- 使用 `ADMIN_TOKEN` 做简单鉴权
- 只服务当前比赛项目，不做多项目管理
- 页面优先服务开发和演示，不追求复杂后台工作流

## 3. 冻结技术栈

- `Vite`
- `React`
- `TypeScript`
- `React Router`
- `TanStack Query`
- `Tailwind CSS`

补充约束：

- 第一版不引入重型状态库
- 第一版不强依赖第三方后台组件库
- 通用按钮、表格、表单、弹窗在项目内自行封装

## 4. 运行形态

```text
Browser
  |
  | HTTP + Bearer Token
  v
admin-web (React SPA)
  |
  | REST API
  v
Fastify Local Server
```

建议：

- 默认端口 `5173`
- 支持 `localhost` 和局域网访问
- 通过环境变量配置 `VITE_API_BASE_URL`

## 5. 目录结构设计

建议 `admin-web/` 采用如下结构：

```text
admin-web/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── env.ts
│   ├── pages/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── dramas/
│   │   ├── episodes/
│   │   ├── highlights/
│   │   ├── interactions/
│   │   ├── playerEngagement/
│   │   ├── branchTasks/
│   │   ├── assetsConfig/
│   │   └── demoTools/
│   ├── components/
│   │   ├── layout/
│   │   ├── table/
│   │   ├── form/
│   │   ├── status/
│   │   ├── modal/
│   │   └── feedback/
│   ├── features/
│   │   ├── auth/
│   │   ├── dramas/
│   │   ├── highlights/
│   │   ├── interactions/
│   │   ├── playerEngagement/
│   │   ├── branchTasks/
│   │   └── demo/
│   ├── services/
│   │   ├── apiClient.ts
│   │   ├── queryClient.ts
│   │   └── queryKeys.ts
│   ├── shared/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── storage/
│   ├── styles/
│   └── main.tsx
└── tests/
    ├── pages/
    ├── components/
    └── helpers/
```

原则：

- `pages/` 承载路由页面
- `features/` 承载页面对应的业务 hooks 和转换逻辑
- `components/` 只放可复用 UI 组件
- `services/` 负责 API 请求和 TanStack Query 配置

## 6. 页面信息架构

```text
Admin Web
├── /login
├── /dashboard
├── /dramas
├── /episodes
├── /highlights
├── /interactions            # 高光互动事件
├── /player-engagement      # 收藏 / 评论 / 弹幕 / 观看记录
├── /branch-tasks
├── /assets-config
└── /demo-tools
```

### 6.1 /login

职责：

- 输入或粘贴 `ADMIN_TOKEN`
- 存入本地存储
- 校验后进入后台

第一版策略：

- 只做 token 登录
- 不做账号密码体系
- 登录成功判断以首个受保护请求成功为准，不额外增加独立登录接口

### 6.2 /dashboard

职责：

- 展示后台首页摘要
- 提供快捷入口

建议内容：

- 当前短剧数量
- 当前高光数量
- 候选高光数量
- 收藏总数
- 播放评论总数
- 弹幕总数
- 观看记录总数
- 分支任务总数
- 常用操作入口

### 6.3 /dramas

职责：

- 查看短剧基础信息
- 查看主打剧/备选剧标识

建议功能：

- 列表展示
- 按状态筛选
- 进入剧集页

### 6.4 /episodes

职责：

- 查看某部剧的剧集列表
- 查看资源路径和分支状态

建议功能：

- 按 `drama` 筛选
- 查看 `video_path` 与 `video_url`
- 查看是否尾集、是否有分支

### 6.5 /highlights

职责：

- 查看和修正高光标签
- 承担最核心的后台内容管理能力

必须支持：

- 按短剧、剧集、状态、类型筛选
- 查看 `candidate/confirmed/disabled`
- 进入独立 `复核` 页面
- 编辑起止时间
- 编辑交互窗口开始/真正出现/结束时间
- 编辑高光类型、强度
- 编辑互动选项
- 确认/禁用高光

### 6.6 /interactions

职责：

- 查看高光互动事件上报记录

建议功能：

- 按剧集、高光、设备筛选
- 查看 `highlight_id`
- 查看 `interaction_type`
- 查看 `option_text`
- 查看 `server_timestamp`

### 6.7 /player-engagement

职责：

- 按内容维度查看播放页沉淀数据
- 支撑内容运营和联调排查

必须支持：

- 以单页多 tab 方式承载：
  - 收藏
  - 评论
  - 弹幕
  - 观看记录
- 每个 tab 支持分页
- 每个 tab 支持按 `dramaId`
- 评论 / 弹幕 / 观看记录支持按 `episodeId`
- 所有 tab 支持按 `userId`

详细要求：

- 收藏：
  - 展示收藏时间、短剧标题、题材标签、用户 ID、设备 ID
- 评论：
  - 展示发送时间、短剧 / 剧集、评论内容、状态、用户 ID、设备 ID
- 弹幕：
  - 展示发送时间、短剧 / 剧集、弹幕内容、触发视频时间点、状态、用户 ID
- 观看记录：
  - 展示最近更新时间、短剧、当前剧集、观看进度、用户 ID、设备 ID

### 6.8 /branch-tasks

职责：

- 同时承担结果内容审核与执行排障
- 查看自定义分支任务状态
- 查看结果摘要和互动反馈
- 对失败任务执行重试

必须支持：

- 按状态筛选 `pending/running/success/failed/timeout/blocked`
- 按 `dramaId` 和 `episodeId` 筛选
- 查看用户 Prompt
- 查看 `result_title/result_hook`
- 查看 `result_story`
- 查看 `storyboard_json`
- 查看 `result_tags_json`
- 查看 `result_interaction_options_json`
- 查看点赞数与评论数
- 查看 `fail_reason`
- 查看创建、开始、结束时间与耗时
- 进入详情抽屉或详情页
- 触发重试

详情层必须支持：

- 基础信息：
  - 短剧
  - 剧集
  - 任务状态
  - 用户 Prompt
- 内容审核区：
  - 结果标题
  - Hook
  - 正文故事
  - Storyboard JSON
  - 标签 JSON
  - 互动选项 JSON
- 排障区：
  - 创建时间
  - 开始时间
  - 结束时间
  - 执行耗时
  - 失败原因
  - 重试次数
- 互动反馈区：
  - 评论列表
  - 点赞列表
  - 统计计数

### 6.9 /assets-config

职责：

- 查看和配置资源路径
- 校验资源映射是否正确

建议功能：

- 查看 `videos_root`
- 查看 `assets_root`
- 查看 `exports_root`
- 输入路径后提交
- 返回校验结果

### 6.10 /demo-tools

职责：

- 进行演示数据初始化与重置

必须支持：

- 重置运行期数据
- 显示重置结果
- 明确说明不会覆盖固定资源与高光基础配置
- 明确说明会清空：
  - 收藏
  - 播放评论
  - 弹幕
  - 观看进度
  - 分支任务及其评论点赞
  - 用户资料缓存

## 7. 页面布局方案

### 7.1 整体布局

- 左侧固定导航栏
- 右侧主内容区
- 顶部显示当前环境、服务地址、操作反馈

### 7.2 导航结构

- 仪表盘
- 短剧管理
- 剧集管理
- 高光管理
- 高光互动
- 播放互动
- 分支任务
- 资源配置
- 演示工具

### 7.3 设计原则

- 工具型优先，避免花哨视觉
- 信息密度中高，但要有明确层级
- 状态色统一：
  - 成功：绿色
  - 运行中：蓝色
  - 警告：黄色
  - 失败/禁用：红色

## 8. 前端分层设计

### 8.1 路由层

负责：

- 页面注册
- 登录态守卫
- 默认重定向

### 8.2 页面层

负责：

- 页面布局
- 组合业务组件
- 触发查询和弹窗

### 8.3 Feature 层

负责：

- 每个页面的查询 hooks
- 表单提交 hooks
- 数据转换和显示映射

### 8.4 Component 层

负责：

- 基础表格
- 筛选条
- 状态标签
- 确认弹窗
- 表单弹窗
- 提示条

### 8.5 Service 层

负责：

- 统一 API Client
- 统一 queryKey
- 鉴权头注入
- 错误转换

## 9. API 对接方案

### 9.1 通用 API Client

统一能力：

- 自动拼接 `VITE_API_BASE_URL`
- 自动注入 `Authorization: Bearer <ADMIN_TOKEN>`
- 统一解析 `{ code, message, data }`
- 非 `code=0` 时抛业务错误

### 9.2 Query Key 约定

建议：

- `['admin', 'dramas', filters]`
- `['admin', 'episodes', filters]`
- `['admin', 'highlights', filters]`
- `['admin', 'interactions', filters]`
- `['admin', 'favorites', filters]`
- `['admin', 'playerComments', filters]`
- `['admin', 'danmaku', filters]`
- `['admin', 'watchProgress', filters]`
- `['admin', 'branchTasks', filters]`
- `['admin', 'branchTask', taskId]`

### 9.3 Mutation 约定

所有写操作成功后：

- 精确失效相关 query
- 提示成功 toast
- 保持当前筛选状态不丢失

## 10. 各页面接口映射

### 10.1 仪表盘

依赖接口：

- `GET /admin/dramas`
- `GET /admin/highlights`
- `GET /admin/favorites`
- `GET /admin/player-comments`
- `GET /admin/danmaku`
- `GET /admin/watch-progress`
- `GET /admin/branch-tasks`

### 10.2 短剧与剧集页

依赖接口：

- `GET /admin/dramas`
- `GET /admin/episodes`

### 10.3 高光管理页

依赖接口：

- `GET /admin/highlights`
- `GET /admin/highlights/:highlightId`
- `GET /admin/highlights/:highlightId/review-context`
- `PATCH /admin/highlights/:highlightId`
- `POST /admin/highlights/:highlightId/confirm`
- `POST /admin/highlights/:highlightId/disable`

### 10.4 互动数据页

依赖接口：

- `GET /admin/interactions`

### 10.5 播放互动页

依赖接口：

- `GET /admin/favorites`
- `GET /admin/player-comments`
- `GET /admin/danmaku`
- `GET /admin/watch-progress`

### 10.6 分支任务页

依赖接口：

- `GET /admin/branch-tasks`
- `GET /admin/branch-tasks/:taskId`
- `POST /admin/branch-tasks/:taskId/retry`

### 10.7 资源配置页

依赖接口：

- `POST /admin/assets/config`

配置落盘约定：

- 后台提交后由服务端写入 `config/resource-paths.local.json`
- 页面需展示当前生效路径和保存结果

### 10.8 演示工具页

依赖接口：

- `POST /admin/demo/reset`

## 11. 表单与交互规范

### 11.1 高光编辑表单

字段：

- `startTimeMs`
- `endTimeMs`
- `interactionStartMs`
- `interactionAppearMs`
- `interactionEndMs`
- `type`
- `intensity`
- `interaction_options_json`
- `status`

校验规则：

- 开始时间必须小于结束时间
- `interactionStartMs <= interactionAppearMs < interactionEndMs`
- 强度只能是 `1-5`
- 互动选项数量限制 `2-4`

### 11.2 任务重试交互

- 仅 `failed/timeout` 显示重试按钮
- 点击后弹确认框
- 成功后列表刷新

### 11.3 分支任务详情交互

- 点击 `详情` 打开右侧详情抽屉
- 详情抽屉不得丢失当前列表筛选和分页状态
- 评论和点赞列表优先展示最新记录
- JSON 字段以可读格式化文本展示，不直接压成单行

### 11.4 演示数据重置交互

- 危险操作按钮单独标识
- 二次确认
- 成功后刷新所有统计页面

## 12. 鉴权与登录态方案

### 12.1 Token 存储

- 存储在 `localStorage`
- key 建议：`drama-pulse-admin-token`

### 12.2 路由守卫

- 未登录只能访问 `/login`
- 已登录访问 `/login` 自动跳 `/dashboard`

### 12.3 失效处理

- 若返回 `40101`
- 清空本地 token
- 跳转登录页
- 显示“后台令牌无效或已失效”

## 13. 状态管理策略

第一版使用：

- 页面本地 UI 状态：`useState`
- 服务端数据状态：`TanStack Query`
- 不引入 Redux、MobX 等全局状态库

适用原因：

- 后台主要是查询、筛选、编辑、重试
- 复杂度集中在数据请求，不在客户端复杂状态图

## 14. 错误处理与反馈

### 14.1 必须覆盖的错误

- 接口超时
- 鉴权失败
- 路径配置错误
- 任务重试失败
- 高光编辑保存失败

### 14.2 UI 反馈方式

- 顶部全局错误条
- 页面空态提示
- 操作成功/失败 toast
- 按钮 loading 态

### 14.3 空态建议

- 高光为空：`当前条件下没有高光记录`
- 分支任务为空：`暂无分支任务`
- 互动为空：`暂无互动数据`
- 播放互动为空：`当前条件下暂无播放互动记录`

## 15. 组件清单

建议优先封装这些基础组件：

- `AppShell`
- `SidebarNav`
- `PageHeader`
- `FilterBar`
- `DataTable`
- `StatusBadge`
- `ConfirmDialog`
- `EditHighlightDialog`
- `JsonPreview`
- `ToastProvider`
- `EmptyState`
- `LoadingBlock`

## 16. 测试策略

### 16.1 测试类型

- 页面渲染测试
- API hooks 测试
- 路由守卫测试
- 关键交互测试

### 16.2 必测场景

- 未登录访问后台被跳转到 `/login`
- 登录后能进入 `/dashboard`
- 高光筛选后列表正确刷新
- 高光编辑成功后列表数据更新
- 播放互动四个 tab 都能独立筛选和分页
- 分支任务详情能同时看到内容结果和互动反馈
- 分支任务重试后状态刷新
- 演示数据重置后操作提示正确

## 17. 开发顺序建议

建议其他 agent 按以下顺序开发：

1. 初始化 `admin-web/` 工程、Tailwind、Router、QueryClient
2. 完成登录页、路由守卫和 API Client
3. 完成整体后台布局与导航
4. 完成短剧页和剧集页
5. 完成高光管理页
6. 完成高光互动页
7. 完成播放互动页
8. 完成分支任务页与详情抽屉
9. 完成资源配置页和演示工具页
10. 完成测试和联调修正

## 18. Agent 分工建议

如果分给多个 agent，建议这样切：

- Agent A：工程初始化、路由、鉴权、布局
- Agent B：短剧页、剧集页、高光管理页
- Agent C：高光互动页、播放互动页
- Agent D：分支任务页、详情抽屉
- Agent E：资源配置页、演示工具页、全局组件和反馈体系

要求：

- 所有 agent 共用统一 `apiClient` 和 `queryKeys`
- 不允许各自重复封装不同的请求层
- 不允许自行发明新的字段名

## 19. 完成标准

当满足以下条件时，Web 管理后台模块算完成：

- 可通过 token 登录进入后台
- 可查看短剧、剧集、高光、高光互动、播放互动和分支任务
- 可编辑高光并执行启停
- 可在播放互动页查看收藏、评论、弹幕、观看记录
- 可在分支任务详情里查看结果内容、互动反馈与执行状态
- 可对失败任务执行重试
- 可执行演示数据重置
- 可查看资源路径配置结果
- 与本地服务端联调稳定
