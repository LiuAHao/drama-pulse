import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import type { BranchOption, Episode } from '@prisma/client';
import { prisma } from '../../shared/db/index.js';
import { NotFoundError, StateError } from '../../shared/errors/index.js';
import { getResourceRoots } from '../resource/index.js';
import { buildEpisodeContext } from './contextBuilder.js';
import { runJsonChat } from './modelClient.js';
import { generateBranchContentFromContext } from './generationPipeline.js';
import type { EpisodeContext } from './types.js';

interface FixedBranchCandidate {
  key: string;
  label: string;
  prompt: string;
  titleHint: string;
  hookHint: string;
}

export interface FixedBranchArtifact {
  optionId: string;
  episodeId: string;
  dramaId: string;
  dramaTitle: string;
  generatedAt: string;
  contentVersion: number;
  artifactSignature: string;
  branchOptionUpdatedAtSnapshot: string;
  candidateLabel: string;
  candidateKey: string;
  candidatePrompt: string;
  resultTitle: string;
  resultHook: string;
  resultStory: string;
  storyboardJson: string;
  shotPromptJson: string;
  storyboardImagesJson: string;
  storyboardManifestJson: string;
  narrationPayloadJson: string;
  referenceAssetsJson: string;
  resultTagsJson: string;
  promptPackageJson: string;
  storyExpansionJson: string;
}

interface FixedBranchManifest {
  episodeId: string;
  publishedAt: string;
  contentVersion: number;
  optionIds: string[];
  optionUpdatedAtSnapshots: Record<string, string>;
  artifactSignatures: Record<string, string>;
}

export type FixedBranchArtifactInspectionStatus =
  | 'valid'
  | 'missing_manifest'
  | 'missing_artifact'
  | 'invalid_artifact'
  | 'content_version_mismatch'
  | 'option_not_in_manifest'
  | 'snapshot_mismatch'
  | 'signature_mismatch';

export interface FixedBranchArtifactInspection {
  status: FixedBranchArtifactInspectionStatus;
  isValid: boolean;
  relativePath: string;
  artifact: FixedBranchArtifact | null;
  optionUpdatedAt: string;
  manifestSnapshot: string;
  artifactSnapshot: string;
  expectedSignature: string;
  manifestSignature: string;
  artifactSignature: string;
}

export interface RefreshedFixedBranchOption {
  optionId: string;
  title: string;
  description: string;
  resultContentPath: string;
  generatedPayloadPath: string;
  artifact: FixedBranchArtifact;
}

type BranchOptionWithEpisode = BranchOption & {
  episode: Episode & {
    drama: {
      id: string;
      title: string;
    };
  };
};

const CONTENT_VERSION = 2;

function buildArtifactRelativePath(episodeId: string, optionId: string): string {
  return `assets/generated/fixed-branches/${episodeId}/${optionId}.json`;
}

function buildManifestRelativePath(episodeId: string): string {
  return `assets/generated/fixed-branches/${episodeId}/manifest.json`;
}

function buildArtifactAbsolutePath(relativePath: string): string {
  const { assetsRoot } = getResourceRoots();
  const relativeInsideAssets = relativePath.replace(/^assets\//, '');
  return path.join(assetsRoot, relativeInsideAssets);
}

function normalizeDescription(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function buildArtifactSignature(option: BranchOptionWithEpisode, candidate: FixedBranchCandidate): string {
  return createHash('sha1')
    .update([
      option.id,
      option.episodeId,
      option.sortIndex,
      option.resultContentPath,
      candidate.key,
      candidate.prompt,
    ].join('|'))
    .digest('hex');
}

function buildArtifactSignatureFromSnapshot(input: {
  optionId: string;
  episodeId: string;
  sortIndex: number;
  resultContentPath: string;
  candidateKey: string;
  candidatePrompt: string;
}): string {
  return createHash('sha1')
    .update([
      input.optionId,
      input.episodeId,
      input.sortIndex,
      input.resultContentPath,
      input.candidateKey,
      input.candidatePrompt,
    ].join('|'))
    .digest('hex');
}

function buildFallbackCandidates(context: EpisodeContext, targetCount: number): FixedBranchCandidate[] {
  const conflict = context.tailStateSnapshot?.currentConflict || context.episodeSummary || '尾集冲突';
  const entry = context.tailStateSnapshot?.branchEntryPoints?.[0] || context.episodeTitle || '尾集落点';
  const unresolved = context.tailStateSnapshot?.unresolvedQuestions?.[0] || '真正的真相';
  const hints = [
    {
      key: 'fallback-shift-balance',
      label: '局势改写候选',
      prompt: `承接${entry}，写一条基于“${conflict}”继续升级、但由主角主动改写局势的尾集固定分支结局。要求承接原剧事实，情绪兑现明确。`,
      titleHint: '局势改写',
      hookHint: '主角没有顺着原结局退场，而是把尾局重新扳回自己手里。',
    },
    {
      key: 'fallback-truth-return',
      label: '真相回收候选',
      prompt: `承接${entry}，写一条围绕“${unresolved}”继续推进、逐步揭开真相并改写关系走向的尾集固定分支结局。要求承接原剧因果。`,
      titleHint: '真相回收',
      hookHint: '原来尾集没有说透的那一层真相，才是真正改写结局的钥匙。',
    },
    {
      key: 'fallback-emotion-payoff',
      label: '情绪兑现候选',
      prompt: `承接${entry}，写一条以人物情绪兑现和关系重组为主的尾集固定分支结局。要求不推翻原剧设定，但让观众获得新的结局体验。`,
      titleHint: '情绪兑现',
      hookHint: '比真相更先落地的，是人物终于不再压着说出口的那句话。',
    },
  ];
  return hints.slice(0, Math.max(2, targetCount));
}

async function generateFixedBranchCandidates(
  context: EpisodeContext,
  targetCount: number,
): Promise<FixedBranchCandidate[]> {
  try {
    const raw = await runJsonChat<{
      candidates?: Array<{
        key?: string;
        label?: string;
        prompt?: string;
        titleHint?: string;
        hookHint?: string;
      }>;
    }>({
      purpose: 'fixed branch candidate generation',
      systemPrompt: `你是短剧尾集固定分支策划助手。

你的任务是基于完整剧情上下文，生成 3 到 5 条“适合作为固定分支”的候选方向。

输出要求：
1. 只输出一个 JSON 对象。
2. JSON 中必须包含 candidates 数组。
3. 每个 candidate 必须包含：
   - key: 英文或拼音 slug
   - label: 候选方向短名
   - prompt: 后续用于生成完整图文分镜分支的提示词
   - titleHint: 结果标题方向提示
   - hookHint: 一句话看点提示
4. 候选之间必须有明显差异，不能都写成同一种情绪或同一种结局。`,
      userPrompt: JSON.stringify({
        dramaTitle: context.dramaTitle,
        episodeTitle: context.episodeTitle,
        episodeSummary: context.episodeSummary,
        mainGenre: context.mainGenre,
        seriesOverview: context.storyContextPackage?.seriesOverview ?? {},
        tailStateSnapshot: context.tailStateSnapshot ?? {},
        characterBible: context.storyContextPackage?.characterBible ?? [],
        targetCount,
      }, null, 2),
      modelEnvKeys: ['DEEPSEEK_BRANCH_TASK_MODEL', 'DEEPSEEK_STORY_CONTEXT_MODEL'],
    });

    const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
    const normalized = candidates
      .map((candidate, index) => {
        const prompt = typeof candidate.prompt === 'string' ? candidate.prompt.trim() : '';
        if (!prompt) return null;
        return {
          key: typeof candidate.key === 'string' && candidate.key.trim() ? candidate.key.trim() : `candidate-${index + 1}`,
          label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : `固定分支候选 ${index + 1}`,
          prompt,
          titleHint: typeof candidate.titleHint === 'string' && candidate.titleHint.trim() ? candidate.titleHint.trim() : `固定分支 ${index + 1}`,
          hookHint: typeof candidate.hookHint === 'string' && candidate.hookHint.trim() ? candidate.hookHint.trim() : prompt.slice(0, 40),
        } satisfies FixedBranchCandidate;
      })
      .filter((candidate): candidate is FixedBranchCandidate => Boolean(candidate));

    if (normalized.length >= 2) {
      return normalized.slice(0, Math.max(targetCount, 2));
    }
  } catch {
    // fall through
  }

  return buildFallbackCandidates(context, targetCount);
}

async function writeArtifact(relativePath: string, artifact: FixedBranchArtifact): Promise<void> {
  const absolutePath = buildArtifactAbsolutePath(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, JSON.stringify(artifact, null, 2) + '\n', 'utf-8');
}

async function writeManifest(relativePath: string, manifest: FixedBranchManifest): Promise<void> {
  const absolutePath = buildArtifactAbsolutePath(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

async function readManifest(episodeId: string): Promise<FixedBranchManifest | null> {
  const absolutePath = buildArtifactAbsolutePath(buildManifestRelativePath(episodeId));
  try {
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(raw) as FixedBranchManifest;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function loadFixedBranchArtifact(
  option: BranchOption,
): Promise<{ relativePath: string; artifact: FixedBranchArtifact } | null> {
  const inspection = await inspectFixedBranchArtifact(option);
  if (!inspection.isValid || !inspection.artifact) {
    return null;
  }

  return {
    relativePath: inspection.relativePath,
    artifact: inspection.artifact,
  };
}

export async function inspectFixedBranchArtifact(
  option: BranchOption,
): Promise<FixedBranchArtifactInspection> {
  const manifest = await readManifest(option.episodeId);
  const relativePath = buildArtifactRelativePath(option.episodeId, option.id);
  const optionUpdatedAt = option.updatedAt.toISOString();

  if (!manifest) {
    return {
      status: 'missing_manifest',
      isValid: false,
      relativePath,
      artifact: null,
      optionUpdatedAt,
      manifestSnapshot: '',
      artifactSnapshot: '',
      expectedSignature: '',
      manifestSignature: '',
      artifactSignature: '',
    };
  }

  const absolutePath = buildArtifactAbsolutePath(relativePath);

  try {
    const raw = await fs.readFile(absolutePath, 'utf-8');
    const artifact = JSON.parse(raw) as FixedBranchArtifact;
    const expectedSignature = buildArtifactSignatureFromSnapshot({
      optionId: option.id,
      episodeId: option.episodeId,
      sortIndex: option.sortIndex,
      resultContentPath: option.resultContentPath,
      candidateKey: artifact.candidateKey,
      candidatePrompt: artifact.candidatePrompt,
    });
    const manifestSnapshot = manifest.optionUpdatedAtSnapshots[option.id] ?? '';
    const artifactSnapshot = artifact.branchOptionUpdatedAtSnapshot ?? '';
    const manifestSignature = manifest.artifactSignatures[option.id] ?? '';
    const artifactSignature = artifact.artifactSignature ?? '';

    let status: FixedBranchArtifactInspectionStatus = 'valid';

    if (
      typeof artifact.contentVersion !== 'number' ||
      artifact.contentVersion < 1 ||
      manifest.contentVersion !== artifact.contentVersion
    ) {
      status = 'content_version_mismatch';
    } else if (!manifest.optionIds.includes(option.id)) {
      status = 'option_not_in_manifest';
    } else if (
      manifestSnapshot !== optionUpdatedAt
      || artifactSnapshot !== optionUpdatedAt
    ) {
      status = 'snapshot_mismatch';
    } else if (
      manifestSignature !== expectedSignature
      || artifactSignature !== expectedSignature
    ) {
      status = 'signature_mismatch';
    }

    return {
      status,
      isValid: status === 'valid',
      relativePath,
      artifact,
      optionUpdatedAt,
      manifestSnapshot,
      artifactSnapshot,
      expectedSignature,
      manifestSignature,
      artifactSignature,
    };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return {
        status: 'missing_artifact',
        isValid: false,
        relativePath,
        artifact: null,
        optionUpdatedAt,
        manifestSnapshot: manifest.optionUpdatedAtSnapshots[option.id] ?? '',
        artifactSnapshot: '',
        expectedSignature: '',
        manifestSignature: manifest.artifactSignatures[option.id] ?? '',
        artifactSignature: '',
      };
    }
    if (error instanceof SyntaxError) {
      return {
        status: 'invalid_artifact',
        isValid: false,
        relativePath,
        artifact: null,
        optionUpdatedAt,
        manifestSnapshot: manifest.optionUpdatedAtSnapshots[option.id] ?? '',
        artifactSnapshot: '',
        expectedSignature: '',
        manifestSignature: manifest.artifactSignatures[option.id] ?? '',
        artifactSignature: '',
      };
    }
    throw error;
  }
}

interface PreparedFixedBranchOption {
  option: BranchOptionWithEpisode;
  title: string;
  description: string;
  generatedPayloadPath: string;
  tempPayloadPath: string;
  artifact: FixedBranchArtifact;
}

async function prepareFixedBranchOption(
  option: BranchOptionWithEpisode,
  candidate: FixedBranchCandidate,
): Promise<PreparedFixedBranchOption> {
  const context = await buildEpisodeContext(option.episodeId);
  const generated = await generateBranchContentFromContext(context, candidate.prompt, {
    mode: 'fixed',
    targetCardCount: 9,
  });
  const generatedPayloadPath = buildArtifactRelativePath(option.episodeId, option.id);
  const artifactSignature = buildArtifactSignature(option, candidate);
  const title = generated.projected.resultTitle || candidate.titleHint;
  const hook = generated.projected.resultHook || candidate.hookHint;
  const story = generated.projected.resultStory;
  const description = normalizeDescription(hook || candidate.hookHint || title);
  const tempPayloadPath = `${generatedPayloadPath}.${randomUUID()}.tmp`;

  const artifact: FixedBranchArtifact = {
    optionId: option.id,
    episodeId: option.episodeId,
    dramaId: option.episode.drama.id,
    dramaTitle: option.episode.drama.title,
    generatedAt: new Date().toISOString(),
    contentVersion: CONTENT_VERSION,
    artifactSignature,
    branchOptionUpdatedAtSnapshot: '',
    candidateLabel: candidate.label,
    candidateKey: candidate.key,
    candidatePrompt: candidate.prompt,
    resultTitle: title,
    resultHook: hook,
    resultStory: story,
    storyboardJson: generated.projected.storyboardJson,
    shotPromptJson: generated.projected.shotPromptJson,
    storyboardImagesJson: generated.projected.storyboardImagesJson,
    storyboardManifestJson: generated.projected.storyboardManifestJson,
    narrationPayloadJson: generated.projected.narrationPayloadJson,
    referenceAssetsJson: generated.projected.referenceAssetsJson,
    resultTagsJson: generated.projected.resultTagsJson,
    promptPackageJson: generated.projected.promptPackageJson,
    storyExpansionJson: generated.projected.storyExpansionJson,
  };

  return {
    option,
    title,
    description,
    generatedPayloadPath,
    tempPayloadPath,
    artifact,
  };
}

export async function refreshFixedBranchOptionsForEpisode(episodeId: string): Promise<{
  episodeId: string;
  refreshedAt: string;
  options: RefreshedFixedBranchOption[];
}> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
  });

  if (!episode) {
    throw new NotFoundError('episode not found');
  }

  if (!episode.isFinalEpisode) {
    throw new StateError('fixed branch refresh only allowed on final episodes');
  }

  const options = await prisma.branchOption.findMany({
    where: {
      episodeId,
      status: 'active',
    },
    orderBy: { sortIndex: 'asc' },
    include: {
      episode: {
        include: {
          drama: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (options.length === 0) {
    throw new NotFoundError('branch options not found');
  }

  const context = await buildEpisodeContext(episodeId);
  const candidates = await generateFixedBranchCandidates(context, Math.max(3, options.length + 1));
  const prepared = await Promise.all(options.map((option, index) => prepareFixedBranchOption(option, candidates[index] ?? candidates[0])));
  const tempManifestPath = `${buildManifestRelativePath(episodeId)}.${randomUUID()}.tmp`;
  const snapshotAt = new Date();

  for (const item of prepared) {
    await writeArtifact(item.tempPayloadPath, item.artifact);
  }

  const updatedOptions = await prisma.$transaction(async (tx) => {
    const updated: Array<{
      id: string;
      title: string;
      description: string;
      resultContentPath: string;
      updatedAt: Date;
    }> = [];

    for (const item of prepared) {
      await tx.branchOption.update({
        where: { id: item.option.id },
        data: {
          title: item.title,
          description: item.description,
          resultType: 'image_story',
        },
      });
      // Prisma may keep updatedAt unchanged when values remain identical, so
      // stamp the snapshot explicitly to keep DB, manifest and artifact aligned.
      await tx.$executeRaw`
        UPDATE branch_options
        SET updated_at = ${snapshotAt}
        WHERE id = ${item.option.id}
      `;
      const option = await tx.branchOption.findUniqueOrThrow({
        where: { id: item.option.id },
      });
      updated.push(option);
    }

    return updated;
  });

  const refreshed: RefreshedFixedBranchOption[] = [];
  try {
    const manifest: FixedBranchManifest = {
      episodeId,
      publishedAt: new Date().toISOString(),
      contentVersion: CONTENT_VERSION,
      optionIds: updatedOptions.map((option) => option.id),
      optionUpdatedAtSnapshots: Object.fromEntries(
        updatedOptions.map((option) => [option.id, option.updatedAt.toISOString()]),
      ),
      artifactSignatures: Object.fromEntries(
        prepared.map((item) => [item.option.id, item.artifact.artifactSignature]),
      ),
    };

    for (let index = 0; index < prepared.length; index += 1) {
      const item = prepared[index];
      const updated = updatedOptions[index];
      const artifact: FixedBranchArtifact = {
        ...item.artifact,
        branchOptionUpdatedAtSnapshot: updated.updatedAt.toISOString(),
      };
      await writeArtifact(item.generatedPayloadPath, artifact);
      await fs.rm(buildArtifactAbsolutePath(item.tempPayloadPath), { force: true });

      refreshed.push({
        optionId: updated.id,
        title: updated.title,
        description: updated.description,
        resultContentPath: updated.resultContentPath,
        generatedPayloadPath: item.generatedPayloadPath,
        artifact,
      });
    }

    await writeManifest(tempManifestPath, manifest);
    await fs.rename(
      buildArtifactAbsolutePath(tempManifestPath),
      buildArtifactAbsolutePath(buildManifestRelativePath(episodeId)),
    );
  } catch (error) {
    await Promise.all(prepared.map((item) => fs.rm(buildArtifactAbsolutePath(item.tempPayloadPath), { force: true })));
    await fs.rm(buildArtifactAbsolutePath(tempManifestPath), { force: true });
    throw error;
  }

  await Promise.all(prepared.map((item) => fs.rm(buildArtifactAbsolutePath(item.tempPayloadPath), { force: true })));
  await fs.rm(buildArtifactAbsolutePath(tempManifestPath), { force: true });

  return {
    episodeId,
    refreshedAt: new Date().toISOString(),
    options: refreshed,
  };
}
