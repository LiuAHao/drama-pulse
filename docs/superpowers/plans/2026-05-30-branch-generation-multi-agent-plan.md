# Branch Generation Multi-Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tail-episode branch system with `2 fixed branches + 1 custom branch`, where custom branches enter a branch list and asynchronously generate `story text + storyboard + storyboard images`.

**Architecture:** Keep the existing `BranchTask` backbone, add structured execution stages plus image-generation sub-results, and split work across server, Android, admin web, and image integration. Fixed branches remain pre-generated assets; only custom branches enter the async task pipeline.

**Tech Stack:** Fastify + Prisma + SQLite, Android Kotlin + Compose, React admin web, OpenAI-compatible image API, Doubao text/multimodal generation.

---

## Parallel Workstreams

### Agent A: Server Schema + API Contract

**Owns**
- `server/prisma/schema.prisma`
- `server/prisma/migrations/*`
- `server/src/shared/schemas/index.ts`
- `server/src/services/clientPayload/index.ts`
- `server/src/modules/branch/routes.ts`
- `server/tests/integration/branch.test.ts`

**Goal**
- Extend `BranchTask` so backend and clients can carry staged custom-branch results without breaking current APIs.

**Dependencies**
- None. This is the first backend foundation task.

**Deliverables**
- `BranchTask` fields for:
  - `branchType`
  - `pipelineStage`
  - `promptPackageJson`
  - `storyExpansionJson`
  - `shotPromptJson`
  - `storyboardImagesJson`
  - `imageTaskStatus`
  - `imageTaskPayloadJson`
- Updated request/response typing for branch task payloads
- Backward-compatible client serialization

**Checklist**
- [ ] Add new Prisma fields to `server/prisma/schema.prisma`
- [ ] Generate and verify a migration under `server/prisma/migrations/`
- [ ] Extend `createBranchTaskSchema` only if needed for new optional request fields; keep `deviceId + episodeId + userPrompt` as minimum
- [ ] Extend `toClientBranchTask()` to return new optional fields without removing existing ones
- [ ] Keep `/branch-tasks` and `/branch-tasks/:taskId` response shape backward-compatible for Android
- [ ] Update branch integration tests to assert new fields exist when populated

**Verification**
- Run: `cd server && pnpm vitest run tests/integration/branch.test.ts`
- Expected: existing branch tests still pass, plus new optional field assertions pass

---

### Agent B: Branch Task Executor Pipeline

**Owns**
- `server/src/services/taskQueue/index.ts`
- `server/src/services/branchTask/constants.ts`
- `server/src/services/branchTask/types.ts` (new)
- `server/src/services/branchTask/contextBuilder.ts` (new)
- `server/src/services/branchTask/promptInterpreter.ts` (new)
- `server/src/services/branchTask/storyGenerator.ts` (new)
- `server/src/services/branchTask/storyboardGenerator.ts` (new)
- `server/src/services/branchTask/resultProjector.ts` (new)
- `server/src/services/branchTask/stageUpdater.ts` (new)
- `server/src/services/branchTask/branchTaskExecutor.ts` (new)
- `server/tests/modules/taskQueue.test.ts`

**Goal**
- Replace the single flat generator with a staged custom-branch executor that outputs:
  - story direction
  - story text
  - storyboard
  - image prompts for each storyboard shot

**Dependencies**
- Needs Agent A’s schema fields merged first or at least available locally.

**Deliverables**
- `pipelineStage` transitions:
  - `queued`
  - `context_prepared`
  - `prompt_interpreted`
  - `story_generated`
  - `storyboard_generated`
  - `storyboard_images_generating`
  - `storyboard_images_generated`
  - `completed`
- Persisted:
  - `resultTitle`
  - `resultHook`
  - `resultStory`
  - `storyboardJson`
  - `promptPackageJson`
  - `storyExpansionJson`
  - `shotPromptJson`

**Checklist**
- [ ] Define branch task internal types in `types.ts`
- [ ] Build context assembly in `contextBuilder.ts` using episode/drama context
- [ ] Implement prompt normalization and branch type classification in `promptInterpreter.ts`
- [ ] Implement structured story generation in `storyGenerator.ts`
- [ ] Implement storyboard generation in `storyboardGenerator.ts`
- [ ] Implement DB stage updates in `stageUpdater.ts`
- [ ] Implement projection from internal result to client-facing fields in `resultProjector.ts`
- [ ] Refactor `processTask()` in `taskQueue/index.ts` to call `branchTaskExecutor.execute(task)`
- [ ] Update timeout/failure handling so failed stage is persisted in `pipelineStage`

**Verification**
- Run: `cd server && pnpm vitest run tests/modules/taskQueue.test.ts`
- Expected: success, timeout, and stage-persistence tests all pass

---

### Agent C: Storyboard Image Generation Integration

**Owns**
- `server/src/services/branchTask/storyboardImageGenerator.ts` (new)
- `server/src/services/branchTask/imageClient.ts` (new)
- `server/src/services/branchTask/types.ts`
- `server/src/services/branchTask/branchTaskExecutor.ts`
- `server/src/services/branchTask/stageUpdater.ts`
- `server/tests/modules/taskQueue.test.ts`
- Optional helper script:
  - `scripts/branch/test_image_generation.py` or `scripts/branch/test_image_generation.ts` (new)

**Goal**
- Turn generated storyboard shots into image-generation requests and persist image-generation results per shot.

**Dependencies**
- Needs Agent A schema fields.
- Should start after Agent B’s `shotPromptJson` contract is stable.

**Deliverables**
- Image-stage result fields:
  - `storyboardImagesJson`
  - `imageTaskStatus`
  - `imageTaskPayloadJson`
- Partial-failure semantics:
  - task may still be `success`
  - `imageTaskStatus = partial_failed`

**Checklist**
- [ ] Implement an OpenAI-compatible image client wrapper in `imageClient.ts`
- [ ] Implement `storyboardImageGenerator.ts` to iterate over storyboard shots and create per-shot image prompts
- [ ] Prefer image-to-image when reference assets exist; allow prompt-only fallback when not available
- [ ] Persist image output metadata into `storyboardImagesJson`
- [ ] Persist upstream request/response summaries into `imageTaskPayloadJson`
- [ ] Update executor flow so storyboard images are part of the main MVP chain
- [ ] Add tests for:
  - full success
  - upstream failure
  - partial image failure with task success

**Verification**
- Run: `cd server && pnpm vitest run tests/modules/taskQueue.test.ts`
- Expected: new image-stage tests pass

---

### Agent D: Android Tail Popup + Branch List UX

**Owns**
- `android-app/app/src/main/java/com/dramapulse/app/feature/branch/BranchViewModel.kt`
- `android-app/app/src/main/java/com/dramapulse/app/feature/branch/BranchResultScreen.kt`
- Related branch UI models and mappers:
  - `android-app/app/src/main/java/com/dramapulse/app/core/model/Drama.kt`
  - `android-app/app/src/main/java/com/dramapulse/app/core/model/remote/BranchDto.kt`
  - `android-app/app/src/main/java/com/dramapulse/app/core/data/Mappers.kt`
- Tests:
  - `android-app/app/src/test/java/com/dramapulse/app/feature/branch/BranchViewModelTest.kt`

**Goal**
- Implement the UX contract:
  - tail popup shows `2 fixed branches + 1 custom option`
  - fixed branches open immediately
  - custom branch creates a task and enters branch list / polling path

**Dependencies**
- Can begin UI work in parallel with backend.
- Needs Agent A field additions only for enhanced rendering, not for MVP popup flow.

**Deliverables**
- Tail popup with 3 options
- Custom branch creation path
- Branch list / branch history entry
- Result rendering for:
  - story text
  - storyboard
  - storyboard images when available

**Checklist**
- [ ] Add a distinct tail popup state in `BranchViewModel`
- [ ] Ensure fixed branches remain immediate-selection content
- [ ] Ensure custom task creation transitions to polling/list state
- [ ] Render image results if `storyboardImagesJson` exists
- [ ] Keep current fixed-branch path stable
- [ ] Update ViewModel tests for new popup and custom-task flow

**Verification**
- Run: `cd android-app && ./gradlew :app:testDebugUnitTest --tests com.dramapulse.app.feature.branch.BranchViewModelTest`
- Expected: popup flow and polling flow tests pass

---

### Agent E: Admin Task Observability

**Owns**
- `admin-web/src/shared/types/index.ts`
- `admin-web/src/pages/branchTasks/BranchTasksPage.tsx`
- Optionally supporting query keys/services if needed
- Backend admin route shape only if strictly required:
  - `server/src/modules/admin/routes.ts`

**Goal**
- Make branch tasks debuggable in admin:
  - stage
  - image status
  - structured JSON
  - image preview data

**Dependencies**
- Needs Agent A schema/API fields.
- Best started after Agent B/C finalize payload field names.

**Deliverables**
- Branch task list columns:
  - `pipelineStage`
  - `imageTaskStatus`
  - `videoTaskStatus`
- Detail panels:
  - prompt package
  - story expansion
  - shot prompts
  - storyboard image list
  - image payload summary

**Checklist**
- [ ] Extend shared admin types for new task fields
- [ ] Add list-level status columns for stage and image state
- [ ] Add detail rendering for JSON payloads and image result metadata
- [ ] Preserve current retry action
- [ ] Make sure detail page handles missing optional fields gracefully

**Verification**
- Run: `cd admin-web && pnpm build`
- Expected: admin project builds successfully with extended types

---

### Agent F: Fixed Branch Seed Data + Branch List Wiring

**Owns**
- `server/prisma/seed.ts`
- `assets/dramas/branches/...` metadata wiring if needed
- `server/src/modules/branch/routes.ts`
- `android-app` profile/branch list surfaces if a list entrypoint already exists

**Goal**
- Ensure the product contract around `2 fixed branches + 1 custom option` is actually realizable from seeded data and API behavior.

**Dependencies**
- Low dependency. Can start early in parallel.

**Deliverables**
- Exactly 2 fixed branch options for each final episode in demo data
- API response shape that lets Android render those 2 options plus a custom CTA
- Branch list query path validated for custom tasks

**Checklist**
- [ ] Verify seeded final episodes have 2 active branch options
- [ ] Ensure `/episodes/:episodeId/branch-options` returns the fixed options in stable order
- [ ] Confirm Android can combine API options with a local “custom branch” CTA
- [ ] Verify custom tasks appear in `/users/:userId/branch-tasks`

**Verification**
- Run: `cd server && pnpm vitest run tests/integration/branch.test.ts`
- Expected: fixed option count and custom task list behavior are stable

---

## Recommended Execution Order

### Wave 1: Foundation
- Agent A
- Agent F

These two unblock everyone else.

### Wave 2: Core Generation
- Agent B
- Agent D

Backend pipeline and Android flow can progress in parallel once schema is stable.

### Wave 3: Visual Result Layer
- Agent C
- Agent E

Image-generation persistence and admin observability should build on the stabilized executor contracts.

### Wave 4: Integration + QA
- One final integration pass across A/B/C/D/E/F

---

## Handoff Contracts Between Agents

### A -> B/C/E
- Final field names in Prisma and API payloads
- Enum string values for:
  - `branchType`
  - `pipelineStage`
  - `imageTaskStatus`

### B -> C/D/E
- Final JSON shape for:
  - `promptPackageJson`
  - `storyExpansionJson`
  - `shotPromptJson`
  - `storyboardJson`

### C -> D/E
- Final JSON shape for:
  - `storyboardImagesJson`
  - `imageTaskPayloadJson`

### F -> D
- Fixed branch count guarantee
- Branch option ordering and display labels

---

## Merge Strategy

- Merge Agent A first
- Merge Agent F next if independent
- Merge Agent B after rebasing on A
- Merge Agent C after rebasing on A+B
- Merge Agent D after rebasing on A+F, then adapt to B/C fields
- Merge Agent E last, once backend field names are stable

---

## Definition of Done

- Final episode UI shows `2 fixed branches + 1 custom option`
- Fixed branches open immediately and do not create tasks
- Custom branches create a `BranchTask` and appear in branch list/history
- Custom task pipeline produces:
  - story text
  - storyboard
  - storyboard images
- Admin can inspect:
  - pipeline stage
  - image task status
  - structured JSON payloads
- Android remains backward-compatible with current branch task fields

