# BranchTask Story Context Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `BranchTask` 真正消费 `story_context_package`，生成承接尾集上下文的剧情扩写、分镜文案和分镜生成提示词。

**Architecture:** 保留现有 `BranchTask -> executor -> projector` 主链路不变，在 `branchTask` 服务层新增“上下文感知 prompt 构造 + 模型 JSON 输出 + fallback”能力。`storyboardJson` 继续保持客户端兼容的轻量展示结构，丰富的镜头提示词、角色/情绪/运镜约束写入 `shotPromptJson`。

**Tech Stack:** TypeScript, Fastify, Prisma, Vitest, Node `fetch`

---

### Task 1: 锁定真实生成行为的测试

**Files:**
- Modify: `server/tests/modules/taskQueue.test.ts`
- Test: `server/tests/modules/taskQueue.test.ts`

- [ ] 为 `BranchTask` staged executor 补一个失败测试，验证生成结果会显式包含 `story_context_package` 提供的尾集冲突、约束或人物信息。
- [ ] 为分镜生成补一个失败测试，验证 `shotPromptJson` 中存在镜头级 `imagePrompt`、角色/情绪/运镜等 richer prompt 字段，而不是当前四段模板。
- [ ] 运行：`cd server && pnpm vitest run tests/modules/taskQueue.test.ts`

### Task 2: 新增分支生成模型客户端与 prompt 构造器

**Files:**
- Create: `server/src/services/branchTask/modelClient.ts`
- Create: `server/src/services/branchTask/promptBuilder.ts`
- Modify: `server/src/services/branchTask/types.ts`

- [ ] 新增统一 JSON chat 客户端，优先读取 `.env` / `server/.env` 的 `DEEPSEEK_*` 配置，默认走 DeepSeek；若缺少凭证则抛出可识别错误给上层 fallback。
- [ ] 新增 prompt builder，把 `EpisodeContext.storyContextPackage`、`tailStateSnapshot`、`PromptPackage` 组装成故事生成 prompt 和分镜生成 prompt。
- [ ] 扩展 `PromptPackage`、`StoryExpansion`、`ShotPrompt` 类型，让 `shotPromptJson` 能承载 richer 结构，但不破坏 `storyboardJson` 的客户端兼容输出。

### Task 3: 用上下文驱动剧情扩写生成

**Files:**
- Modify: `server/src/services/branchTask/storyGenerator.ts`
- Modify: `server/src/services/branchTask/promptInterpreter.ts`

- [ ] 将 `generateStory` 从模板字符串替换成“模型优先、fallback 兜底”的实现。
- [ ] 要求模型输出结构化 JSON，至少包含：`direction`、`title`、`hook`、`story`、`tags`，并显式承接尾集冲突、主线设定、用户 prompt。
- [ ] 当模型不可用或解析失败时，fallback 仍然必须消费 `story_context_package`，不能退回完全脱离上下文的空模板。

### Task 4: 用上下文驱动分镜文案和提示词生成

**Files:**
- Modify: `server/src/services/branchTask/storyboardGenerator.ts`
- Modify: `server/src/services/branchTask/resultProjector.ts`

- [ ] 将 `generateStoryboard` 改成基于故事扩写和剧情上下文生成 4-6 个镜头。
- [ ] 每个镜头至少包含：`scene`、`description`、`duration`、`imagePrompt`，并补充 richer 字段如 `characters`、`emotion`、`camera`、`caption`、`location`、`negativePrompt`。
- [ ] `resultProjector` 继续把 `storyboardJson` 投影成轻量 `{scene, description, duration}`，同时把完整镜头提示词保留在 `shotPromptJson`。

### Task 5: 验证真实链路不回归

**Files:**
- Modify: `server/tests/modules/taskQueue.test.ts`
- Modify: `server/tests/integration/branch.test.ts`（如需要）

- [ ] 运行：`cd server && pnpm vitest run tests/modules/taskQueue.test.ts tests/integration/branch.test.ts`
- [ ] 运行：`cd server && pnpm exec tsc --noEmit`
- [ ] 抽查一条真实任务结果，确认 `resultStory`、`storyboardJson`、`shotPromptJson` 都承接 `story_context_package`。
