import { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/db/index.js';
import { AuthError } from '../../shared/errors/index.js';
import { success } from '../../shared/response/index.js';
import {
  adminDanmakuFilterSchema,
  highlightIdParamSchema,
  taskIdParamSchema,
  updateHighlightSchema,
  adminFavoriteFilterSchema,
  adminEpisodeFilterSchema,
  adminHighlightFilterSchema,
  adminInteractionFilterSchema,
  adminPlayerCommentFilterSchema,
  adminBranchTaskFilterSchema,
  adminWatchProgressFilterSchema,
  assetsConfigSchema,
  episodeIdParamSchema,
} from '../../shared/schemas/index.js';
import { getBaseUrlFromRequest, getResourceConfigPath, getResourceRoots, pathToUrl, getResourceRoots as getRoots } from '../../services/resource/index.js';
import { toClientBranchTask, toClientDrama, toClientEpisode, toClientWatchProgress } from '../../services/clientPayload/index.js';
import {
  inspectFixedBranchArtifact,
  refreshFixedBranchOptionsForEpisode,
  type FixedBranchArtifactInspectionStatus,
} from '../../services/branchTask/fixedBranchGenerator.js';
import { toClientBranchOption } from '../../services/clientPayload/index.js';
import { normalizeHighlightConfig } from '../../services/highlight/config.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const MAX_RETRY = 3;
const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(process.cwd(), '..');
const HIGHLIGHT_SCRIPT_DIR = path.join(REPO_ROOT, 'scripts', 'highlight');
let cachedHighlightPythonBin: string | null = null;

async function fileExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

async function findTranscriptPath(
  exportsRoot: string,
  dramaId: string,
  episodeId: string,
  episodeNo: number,
): Promise<string | null> {
  const directCandidates = [
    path.join(exportsRoot, 'highlights', dramaId, `${episodeId}.transcript.json`),
    path.join(exportsRoot, 'highlights', dramaId, `episode-${episodeNo}-transcript.json`),
    path.join(exportsRoot, 'highlight-demo', `${episodeId}-transcript.json`),
    path.join(exportsRoot, 'highlight-demo', `episode-${episodeNo}-transcript.json`),
    path.join(exportsRoot, `${episodeId}-transcript.json`),
  ];

  for (const candidatePath of directCandidates) {
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  const nestedHighlightDemoCandidates = [
    path.join(exportsRoot, 'highlight-demo', `ep${episodeNo}`),
    path.join(exportsRoot, 'highlight-demo', `episode-${episodeNo}`),
    path.join(exportsRoot, 'highlight-demo', `${episodeId}`),
  ];

  for (const dir of nestedHighlightDemoCandidates) {
    const candidatePath = path.join(dir, `episode-${episodeNo}-transcript.json`);
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

async function findStoryContextPath(
  exportsRoot: string,
  episodeId: string,
  episodeNo: number,
): Promise<string | null> {
  const directCandidates = [
    path.join(exportsRoot, 'highlight-demo', `${episodeId}-story-context.json`),
    path.join(exportsRoot, 'highlight-demo', `episode-${episodeNo}-story-context.json`),
    path.join(exportsRoot, `${episodeId}-story-context.json`),
  ];

  for (const candidatePath of directCandidates) {
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  const nestedHighlightDemoCandidates = [
    path.join(exportsRoot, 'highlight-demo', `ep${episodeNo}`),
    path.join(exportsRoot, 'highlight-demo', `episode-${episodeNo}`),
    path.join(exportsRoot, 'highlight-demo', `${episodeId}`),
  ];

  for (const dir of nestedHighlightDemoCandidates) {
    const candidatePath = path.join(dir, `episode-${episodeNo}-story-context.json`);
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

async function resolveHighlightPythonBin(): Promise<string> {
  if (cachedHighlightPythonBin) {
    return cachedHighlightPythonBin;
  }

  const candidates = [
    process.env.HIGHLIGHT_PYTHON_BIN,
    process.env.PYTHON_BIN,
    'python3',
    '/opt/homebrew/Caskroom/miniforge/base/bin/python3',
    '/opt/homebrew/bin/python3',
    '/usr/bin/python3',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['-c', 'import openai'], {
        cwd: REPO_ROOT,
        timeout: 15_000,
        maxBuffer: 1024 * 1024,
      });
      cachedHighlightPythonBin = candidate;
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    'no usable Python interpreter found for highlight review (missing openai package)',
  );
}

function toStageOneCandidatePayload(highlight: {
  episodeId: string;
  startTimeMs: number;
  endTimeMs: number;
  type: string;
  title: string;
  description: string;
  intensity: number;
  templateId: string;
  interactionOptionsJson: string;
  reason: string;
  confidence: number;
  supportingSegmentIdsJson: string;
  speakerGuess: string | null;
  targetCharacterGuess: string | null;
  mentionedCharactersJson: string;
  characterGuessConfidence: number | null;
}): Record<string, unknown> {
  const parseArray = (raw: string): unknown[] => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const normalizedConfig = normalizeHighlightConfig({
    type: highlight.type,
    intensity: highlight.intensity,
    templateId: highlight.templateId,
  });

  return {
    episodeId: highlight.episodeId,
    startTimeMs: highlight.startTimeMs,
    endTimeMs: highlight.endTimeMs,
    highlightType: normalizedConfig.type,
    title: highlight.title,
    description: highlight.description,
    intensity: normalizedConfig.intensity,
    templateId: normalizedConfig.templateId,
    interactionOptions: parseArray(highlight.interactionOptionsJson),
    reason: highlight.reason,
    confidence: highlight.confidence,
    supportingSegmentIds: parseArray(highlight.supportingSegmentIdsJson),
    speakerGuess: highlight.speakerGuess || undefined,
    targetCharacterGuess: highlight.targetCharacterGuess || undefined,
    mentionedCharacters: parseArray(highlight.mentionedCharactersJson),
    characterGuessConfidence: highlight.characterGuessConfidence,
  };
}

function toAdminHighlightPayload(highlight: {
  id: string;
  episodeId: string;
  startTimeMs: number;
  endTimeMs: number;
  interactionStartMs: number | null;
  interactionAppearMs: number | null;
  interactionEndMs: number | null;
  type: string;
  title: string;
  description: string;
  intensity: number;
  templateId: string;
  interactionOptionsJson: string;
  visualEffectType: string;
  source: string;
  confidence: number;
  status: string;
  reason: string;
  supportingSegmentIdsJson: string;
  speakerGuess: string | null;
  targetCharacterGuess: string | null;
  mentionedCharactersJson: string;
  characterGuessConfidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const normalizedConfig = normalizeHighlightConfig({
    type: highlight.type,
    intensity: highlight.intensity,
    templateId: highlight.templateId,
  });

  return {
    ...highlight,
    type: normalizedConfig.type,
    intensity: normalizedConfig.intensity,
    templateId: normalizedConfig.templateId,
    displayMode: normalizedConfig.displayMode,
    resolvedInteractionType: normalizedConfig.resolvedInteractionType,
    soundEnabled: normalizedConfig.soundEnabled,
    singleUse: normalizedConfig.singleUse,
  };
}

async function runAiHighlightReview(highlight: {
  id: string;
  episodeId: string;
  startTimeMs: number;
  endTimeMs: number;
  type: string;
  title: string;
  description: string;
  intensity: number;
  templateId: string;
  interactionOptionsJson: string;
  reason: string;
  confidence: number;
  supportingSegmentIdsJson: string;
  speakerGuess: string | null;
  targetCharacterGuess: string | null;
  mentionedCharactersJson: string;
  characterGuessConfidence: number | null;
  episode: { id: string; episodeNo: number; dramaId: string };
}) {
  const roots = getRoots();
  const transcriptPath = await findTranscriptPath(
    roots.exportsRoot,
    highlight.episode.dramaId,
    highlight.episode.id,
    highlight.episode.episodeNo,
  );
  if (!transcriptPath) {
    throw new Error('transcript file not found for highlight review');
  }

  const storyContextPath = await findStoryContextPath(
    roots.exportsRoot,
    highlight.episode.id,
    highlight.episode.episodeNo,
  );

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drama-pulse-highlight-review-'));
  const inputPath = path.join(tempDir, 'candidate.json');
  const reviewedPath = path.join(tempDir, 'reviewed.json');
  const finalPath = path.join(tempDir, 'final.json');

  try {
    const pythonBin = await resolveHighlightPythonBin();

    await fs.writeFile(
      inputPath,
      JSON.stringify([toStageOneCandidatePayload(highlight)], null, 2),
      'utf-8',
    );

    const command = [
      pythonBin,
      path.join(HIGHLIGHT_SCRIPT_DIR, 'review_highlights.py'),
      inputPath,
      '-t',
      transcriptPath,
      '--save-reviewed',
      reviewedPath,
      '-o',
      finalPath,
    ];

    if (storyContextPath) {
      command.push('--story-context', storyContextPath);
    }

    await execFileAsync(command[0], command.slice(1), {
      cwd: REPO_ROOT,
      timeout: 10 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 8,
    });

    const reviewedPayload = JSON.parse(await fs.readFile(reviewedPath, 'utf-8')) as Array<Record<string, unknown>>;
    const finalPayload = JSON.parse(await fs.readFile(finalPath, 'utf-8')) as Array<Record<string, unknown>>;

    return {
      reviewed: reviewedPayload[0] ?? null,
      final: finalPayload[0] ?? null,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function applyApprovedAiReview(
  highlight: {
    id: string;
    source: string;
    confidence: number;
  },
  aiResult: {
    reviewed: Record<string, unknown> | null;
    final: Record<string, unknown> | null;
  },
) {
  const reviewed = aiResult.reviewed;
  const final = aiResult.final;

  if (!reviewed) {
    return {
      approved: false,
      reviewDecision: '',
      reviewReason: 'ai review returned empty result',
      updated: null,
    };
  }

  const reviewDecision = String(reviewed.reviewDecision || '');
  const approved = Boolean(reviewed.approved);

  if (!final || !approved || (reviewDecision !== 'approve' && reviewDecision !== 'revise')) {
    return {
      approved: false,
      reviewDecision,
      reviewReason: String(reviewed.reviewReason || ''),
      updated: null,
    };
  }

  const normalizedConfig = normalizeHighlightConfig({
    type: String(final.highlightType || ''),
    intensity: Number(final.intensity),
    templateId: String(final.templateId || '').trim(),
  });

  const updated = await prisma.highlight.update({
    where: { id: highlight.id },
    data: {
      startTimeMs: Number(final.startTimeMs),
      endTimeMs: Number(final.endTimeMs),
      interactionStartMs: Number(final.interactionStartMs),
      interactionAppearMs: Number(final.interactionAppearMs),
      interactionEndMs: Number(final.interactionEndMs),
      type: normalizedConfig.type,
      title: String(final.title || '').trim(),
      description: String(final.description || '').trim(),
      intensity: normalizedConfig.intensity,
      templateId: normalizedConfig.templateId,
      interactionOptionsJson: JSON.stringify(final.interactionOptions || [], null, 0),
      visualEffectType: String(final.visualEffectType || '').trim(),
      confidence: Number(final.confidence ?? highlight.confidence),
      reason: String(final.reason || '').trim(),
      supportingSegmentIdsJson: JSON.stringify(final.supportingSegmentIds || [], null, 0),
      speakerGuess: final.speakerGuess ? String(final.speakerGuess) : '',
      targetCharacterGuess: final.targetCharacterGuess ? String(final.targetCharacterGuess) : '',
      mentionedCharactersJson: JSON.stringify(final.mentionedCharacters || [], null, 0),
      characterGuessConfidence:
        typeof final.characterGuessConfidence === 'number'
          ? final.characterGuessConfidence
          : null,
      status: 'confirmed',
      source: highlight.source === 'ai' ? 'ai_manual' : highlight.source,
    },
  });

  return {
    approved: true,
    reviewDecision,
    reviewReason: String(reviewed.reviewReason || ''),
    updated,
  };
}

function isLocalNetwork(ip: string | undefined): boolean {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.3') ||
    ip.startsWith('192.168.') ||
    ip === 'localhost'
  );
}

function toAdminDrama(drama: {
  id: string;
  title: string;
  description: string;
  coverPath: string;
  tagsJson: string;
  mainGenre: string;
  isFeatured: boolean;
  displayOrder: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}, baseUrl: string) {
  const coverUrl = pathToUrl(drama.coverPath, baseUrl);
  return {
    ...toClientDrama(drama, baseUrl),
    coverUrl,
  };
}

function toAdminPlayerComment(
  comment: {
    id: string;
    userId: string;
    deviceId: string;
    episodeId: string;
    content: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    episode: {
      id: string;
      dramaId: string;
      episodeNo: number;
      title: string;
      videoPath: string;
      durationMs: number;
      summary: string;
      isFinalEpisode: boolean;
      hasBranch: boolean;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      drama: {
        id: string;
        title: string;
        description: string;
        coverPath: string;
        tagsJson: string;
        mainGenre: string;
        isFeatured: boolean;
        displayOrder: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      };
    };
  },
  baseUrl: string,
) {
  return {
    id: comment.id,
    userId: comment.userId,
    deviceId: comment.deviceId,
    episodeId: comment.episodeId,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    episode: {
      ...toClientEpisode(comment.episode, baseUrl),
      drama: toAdminDrama(comment.episode.drama, baseUrl),
    },
  };
}

function toAdminDanmaku(
  message: {
    id: string;
    userId: string;
    deviceId: string;
    episodeId: string;
    content: string;
    triggerPositionMs: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    episode: {
      id: string;
      dramaId: string;
      episodeNo: number;
      title: string;
      videoPath: string;
      durationMs: number;
      summary: string;
      isFinalEpisode: boolean;
      hasBranch: boolean;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      drama: {
        id: string;
        title: string;
        description: string;
        coverPath: string;
        tagsJson: string;
        mainGenre: string;
        isFeatured: boolean;
        displayOrder: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      };
    };
  },
  baseUrl: string,
) {
  return {
    id: message.id,
    userId: message.userId,
    deviceId: message.deviceId,
    episodeId: message.episodeId,
    content: message.content,
    triggerPositionMs: message.triggerPositionMs,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    episode: {
      ...toClientEpisode(message.episode, baseUrl),
      drama: toAdminDrama(message.episode.drama, baseUrl),
    },
  };
}

export async function adminRoutes(fastify: FastifyInstance) {
  function formatFixedBranchArtifactStatus(status: FixedBranchArtifactInspectionStatus): string {
    switch (status) {
      case 'valid':
        return 'artifact 有效，前后台都可正常读取';
      case 'missing_manifest':
        return '缺少 manifest，后台无法确认这一批固定分支属于当前尾集';
      case 'missing_artifact':
        return 'manifest 存在，但对应的固定分支详情文件缺失';
      case 'invalid_artifact':
        return '固定分支详情文件存在，但 JSON 已损坏或格式不合法';
      case 'content_version_mismatch':
        return 'artifact 版本与当前服务要求不一致';
      case 'option_not_in_manifest':
        return 'manifest 里没有登记这个固定分支';
      case 'snapshot_mismatch':
        return 'artifact 与数据库里的 branch option 快照时间不一致，前台接口会隐藏它';
      case 'signature_mismatch':
        return 'artifact 的签名与当前数据库字段不一致，前台接口会隐藏它';
      default:
        return 'artifact 状态未知';
    }
  }

  fastify.addHook('onRequest', async (request) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new AuthError();
    const token = auth.slice(7);
    if (token !== process.env.ADMIN_TOKEN) throw new AuthError();

    const forwarded = request.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : request.ip;
    if (!isLocalNetwork(clientIp)) {
      throw new AuthError('admin access restricted to local network');
    }
  });

  // GET /admin/dramas - list all dramas (including hidden) with episode count
  fastify.get('/admin/dramas', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const dramas = await prisma.drama.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { episodes: true } },
      },
    });

    const data = dramas.map((d) => ({
      ...d,
      coverUrl: pathToUrl(d.coverPath, baseUrl),
      episodeCount: d._count.episodes,
      _count: undefined,
    }));

    reply.send(success(data));
  });

  // GET /admin/episodes - list all episodes with drama info
  fastify.get('/admin/episodes', async (request, reply) => {
    const query = adminEpisodeFilterSchema.parse(request.query);
    const baseUrl = getBaseUrlFromRequest(request);
    const episodes = await prisma.episode.findMany({
      where: query.dramaId ? { dramaId: query.dramaId } : undefined,
      orderBy: [{ dramaId: 'asc' }, { episodeNo: 'asc' }],
      include: { drama: { select: { id: true, title: true } } },
    });
    const data = episodes.map((episode) => ({
      ...episode,
      videoUrl: pathToUrl(episode.videoPath, baseUrl),
    }));

    reply.send(success(data));
  });

  // GET /admin/highlights - list highlights with filters, paginated
  fastify.get('/admin/highlights', async (request, reply) => {
    const query = adminHighlightFilterSchema.parse(request.query);
    const { page, pageSize, status, episodeId } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (episodeId) where.episodeId = episodeId;

    const [items, total] = await Promise.all([
      prisma.highlight.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { episode: { select: { id: true, title: true, episodeNo: true } } },
      }),
      prisma.highlight.count({ where }),
    ]);

    reply.send(success({
      items: items.map((item) => toAdminHighlightPayload(item)),
      total,
      page,
      pageSize,
    }));
  });

  // PATCH /admin/highlights/:highlightId - update highlight fields
  fastify.patch('/admin/highlights/:highlightId', async (request, reply) => {
    const { highlightId } = highlightIdParamSchema.parse(request.params);
    const body = updateHighlightSchema.parse(request.body);

    const highlight = await prisma.highlight.findUnique({ where: { id: highlightId } });
    if (!highlight) {
      reply.status(404).send({ code: 40004, message: 'highlight not found', data: null });
      return;
    }

    // Validate JSON string fields are valid JSON arrays
    const jsonFields = ['interactionOptionsJson', 'supportingSegmentIdsJson', 'mentionedCharactersJson'];
    for (const field of jsonFields) {
      const value = body[field as keyof typeof body];
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            reply.status(400).send({ code: 40001, message: `${field} must be a JSON array`, data: null });
            return;
          }
        } catch {
          reply.status(400).send({ code: 40001, message: `${field} is not valid JSON`, data: null });
          return;
        }
      }
    }

    // Validate time range
    const startMs = body.startTimeMs ?? highlight.startTimeMs;
    const endMs = body.endTimeMs ?? highlight.endTimeMs;
    if (startMs >= endMs) {
      reply.status(400).send({ code: 40001, message: 'startTimeMs must be less than endTimeMs', data: null });
      return;
    }
    if (endMs - startMs > 30000) {
      reply.status(400).send({ code: 40001, message: 'highlight duration must not exceed 30 seconds', data: null });
      return;
    }

    const interactionStartMs = body.interactionStartMs ?? highlight.interactionStartMs ?? startMs;
    const interactionAppearMs = body.interactionAppearMs ?? highlight.interactionAppearMs ?? Math.min(endMs, startMs + 600);
    const interactionEndMs = body.interactionEndMs ?? highlight.interactionEndMs ?? endMs + 1500;
    if (interactionStartMs < 0 || interactionEndMs <= interactionStartMs) {
      reply.status(400).send({ code: 40001, message: 'interaction window is invalid', data: null });
      return;
    }
    if (interactionAppearMs < interactionStartMs) {
      reply.status(400).send({ code: 40001, message: 'interactionAppearMs must be >= interactionStartMs', data: null });
      return;
    }
    if (interactionEndMs <= interactionAppearMs) {
      reply.status(400).send({ code: 40001, message: 'interactionEndMs must be > interactionAppearMs', data: null });
      return;
    }
    if (interactionStartMs > startMs + 3000) {
      reply.status(400).send({ code: 40001, message: 'interactionStartMs too far from startTimeMs', data: null });
      return;
    }
    if (interactionAppearMs > endMs + 500) {
      reply.status(400).send({ code: 40001, message: 'interactionAppearMs too late vs endTimeMs', data: null });
      return;
    }
    if (interactionEndMs < endMs - 1000) {
      reply.status(400).send({ code: 40001, message: 'interactionEndMs too early vs endTimeMs', data: null });
      return;
    }

    const normalizedConfig = normalizeHighlightConfig({
      type: body.type ?? highlight.type,
      intensity: body.intensity ?? highlight.intensity,
      templateId: body.templateId ?? highlight.templateId,
    });

    const updated = await prisma.highlight.update({
      where: { id: highlightId },
      data: {
        ...body,
        type: normalizedConfig.type,
        intensity: normalizedConfig.intensity,
        templateId: normalizedConfig.templateId,
        interactionStartMs,
        interactionAppearMs,
        interactionEndMs,
      },
    });

    reply.send(success(toAdminHighlightPayload(updated)));
  });

  // GET /admin/highlights/:highlightId - get single highlight detail with episode + drama
  fastify.get('/admin/highlights/:highlightId', async (request, reply) => {
    const { highlightId } = highlightIdParamSchema.parse(request.params);
    const baseUrl = getBaseUrlFromRequest(request);

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        episode: {
          include: { drama: { select: { id: true, title: true } } },
        },
      },
    });

    if (!highlight) {
      reply.status(404).send({ code: 40004, message: 'highlight not found', data: null });
      return;
    }

    const { episode, ...highlightData } = highlight;
    const { drama, ...episodeData } = episode;

    reply.send(success({
      ...toAdminHighlightPayload(highlightData),
      episode: {
        ...episodeData,
        videoUrl: pathToUrl(episodeData.videoPath, baseUrl),
      },
      drama,
    }));
  });

  // GET /admin/highlights/:highlightId/review-context - get review context with transcript
  fastify.get('/admin/highlights/:highlightId/review-context', async (request, reply) => {
    const { highlightId } = highlightIdParamSchema.parse(request.params);
    const baseUrl = getBaseUrlFromRequest(request);

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        episode: {
          include: { drama: { select: { id: true, title: true } } },
        },
      },
    });

    if (!highlight) {
      reply.status(404).send({ code: 40004, message: 'highlight not found', data: null });
      return;
    }

    const { episode, ...highlightData } = highlight;
    const { drama, ...episodeData } = episode;

    // Try to find transcript file
    let transcriptContext: Array<{ segmentId: string; startTimeMs: number; endTimeMs: number; text: string }> = [];
    let transcriptAvailable = false;

    try {
      const roots = getRoots();
      const transcriptPath = await findTranscriptPath(
        roots.exportsRoot,
        episode.dramaId,
        episode.id,
        episode.episodeNo,
      );

      if (transcriptPath) {
        const raw = await fs.readFile(transcriptPath, 'utf-8');
        const transcript = JSON.parse(raw);
        const segments = transcript.segments || [];

        // Find segments within ±3 seconds of the highlight time range
        const contextStart = highlight.startTimeMs - 3000;
        const contextEnd = highlight.endTimeMs + 3000;

        transcriptContext = segments
          .filter((s: { startTimeMs: number; endTimeMs: number }) =>
            s.endTimeMs >= contextStart && s.startTimeMs <= contextEnd
          )
          .slice(0, 20); // limit to 20 segments
        transcriptAvailable = true;
      }
    } catch {
      // transcript resolution failed entirely
    }

    // Get candidate neighbors (other candidates in same episode)
    const candidateNeighbors = await prisma.highlight.findMany({
      where: {
        episodeId: episode.id,
        status: 'candidate',
        id: { not: highlightId },
      },
      orderBy: { startTimeMs: 'asc' },
      select: { id: true, title: true, startTimeMs: true, endTimeMs: true, type: true, status: true },
    });

    reply.send(success({
      highlight: {
        ...toAdminHighlightPayload(highlightData),
        episode: {
          ...episodeData,
          videoUrl: pathToUrl(episodeData.videoPath, baseUrl),
        },
        drama,
      },
      transcriptContext,
      transcriptAvailable,
      candidateNeighbors,
    }));
  });

  // POST /admin/highlights/:highlightId/confirm - confirm a highlight
  fastify.post('/admin/highlights/:highlightId/confirm', async (request, reply) => {
    const { highlightId } = highlightIdParamSchema.parse(request.params);

    const highlight = await prisma.highlight.findUnique({ where: { id: highlightId } });
    if (!highlight) {
      reply.status(404).send({ code: 40004, message: 'highlight not found', data: null });
      return;
    }

    const updateData: { status: string; source?: string } = { status: 'confirmed' };
    if (highlight.source === 'ai') {
      updateData.source = 'ai_manual';
    }

    const updated = await prisma.highlight.update({
      where: { id: highlightId },
      data: updateData,
    });

    reply.send(success({ id: updated.id, status: updated.status, source: updated.source }));
  });

  // POST /admin/highlights/:highlightId/ai-review - run DeepSeek review and confirm if approved
  fastify.post('/admin/highlights/:highlightId/ai-review', async (request, reply) => {
    const { highlightId } = highlightIdParamSchema.parse(request.params);

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        episode: {
          select: {
            id: true,
            episodeNo: true,
            dramaId: true,
          },
        },
      },
    });

    if (!highlight) {
      reply.status(404).send({ code: 40004, message: 'highlight not found', data: null });
      return;
    }

    if (highlight.status !== 'candidate') {
      reply.status(400).send({ code: 40001, message: 'only candidate highlights can be AI reviewed', data: null });
      return;
    }

    let aiResult: Awaited<ReturnType<typeof runAiHighlightReview>>;
    try {
      aiResult = await runAiHighlightReview(highlight);
    } catch (error) {
      reply.status(500).send({
        code: 50001,
        message: error instanceof Error ? error.message : 'ai review failed',
        data: null,
      });
      return;
    }

    const reviewed = aiResult.reviewed;
    const applied = await applyApprovedAiReview(highlight, aiResult);

    if (!applied.approved || !applied.updated) {
      reply.send(success({
        id: highlight.id,
        status: highlight.status,
        source: highlight.source,
        aiReview: {
          approved: false,
          reviewDecision: applied.reviewDecision,
          reviewReason: applied.reviewReason,
        },
      }));
      return;
    }

    reply.send(success({
      id: applied.updated.id,
      status: applied.updated.status,
      source: applied.updated.source,
      aiReview: {
        approved: true,
        reviewDecision: applied.reviewDecision,
        reviewReason: applied.reviewReason,
      },
    }));
  });

  // POST /admin/highlights/ai-review-batch - run DeepSeek review for candidate highlights under current filters
  fastify.post('/admin/highlights/ai-review-batch', async (request, reply) => {
    const query = adminHighlightFilterSchema.partial({
      page: true,
      pageSize: true,
    }).parse(request.query);
    const where: Record<string, unknown> = { status: 'candidate' };
    if (query.episodeId) where.episodeId = query.episodeId;

    const candidates = await prisma.highlight.findMany({
      where,
      orderBy: { startTimeMs: 'asc' },
      include: {
        episode: {
          select: {
            id: true,
            episodeNo: true,
            dramaId: true,
          },
        },
      },
    });

    const results: Array<{
      id: string;
      title: string;
      approved: boolean;
      reviewDecision: string;
      reviewReason: string;
      error?: string;
    }> = [];

    for (const highlight of candidates) {
      try {
        const aiResult = await runAiHighlightReview(highlight);
        const applied = await applyApprovedAiReview(highlight, aiResult);
        results.push({
          id: highlight.id,
          title: highlight.title,
          approved: applied.approved,
          reviewDecision: applied.reviewDecision,
          reviewReason: applied.reviewReason,
        });
      } catch (error) {
        results.push({
          id: highlight.id,
          title: highlight.title,
          approved: false,
          reviewDecision: 'error',
          reviewReason: '',
          error: error instanceof Error ? error.message : 'ai review failed',
        });
      }
    }

    const approvedCount = results.filter((item) => item.approved).length;
    const failedCount = results.length - approvedCount;

    reply.send(success({
      total: results.length,
      approvedCount,
      failedCount,
      results,
    }));
  });

  // POST /admin/highlights/:highlightId/enable
  fastify.post('/admin/highlights/:highlightId/enable', async (request, reply) => {
    const { highlightId } = highlightIdParamSchema.parse(request.params);

    const updated = await prisma.highlight.update({
      where: { id: highlightId },
      data: { status: 'confirmed' },
    });

    reply.send(success(updated));
  });

  // POST /admin/highlights/:highlightId/disable
  fastify.post('/admin/highlights/:highlightId/disable', async (request, reply) => {
    const { highlightId } = highlightIdParamSchema.parse(request.params);

    const updated = await prisma.highlight.update({
      where: { id: highlightId },
      data: { status: 'disabled' },
    });

    reply.send(success(updated));
  });

  // GET /admin/interactions - list interactions with filters, paginated
  fastify.get('/admin/interactions', async (request, reply) => {
    const query = adminInteractionFilterSchema.parse(request.query);
    const { page, pageSize, highlightId, deviceId, episodeId } = query;

    const where: Record<string, unknown> = {};
    if (highlightId) where.highlightId = highlightId;
    if (deviceId) where.deviceId = deviceId;
    if (episodeId) where.episodeId = episodeId;

    const [items, total] = await Promise.all([
      prisma.interactionEvent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { serverTimestamp: 'desc' },
      }),
      prisma.interactionEvent.count({ where }),
    ]);

    reply.send(success({
      items: items.map((item) => ({
        ...item,
        clientTimestamp: item.clientTimestamp.toString(),
      })),
      total,
      page,
      pageSize,
    }));
  });

  // GET /admin/branch-tasks - list branch tasks with filters, paginated
  fastify.get('/admin/branch-tasks', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const query = adminBranchTaskFilterSchema.parse(request.query);
    const { page, pageSize, status, episodeId, dramaId, branchType, pipelineStage, imageTaskStatus } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (episodeId) where.episodeId = episodeId;
    if (branchType) where.branchType = branchType;
    if (pipelineStage) where.pipelineStage = pipelineStage;
    if (imageTaskStatus) where.imageTaskStatus = imageTaskStatus;
    if (dramaId) {
      where.episode = { is: { dramaId } };
    }

    const [items, total] = await Promise.all([
      prisma.branchTask.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          episode: {
            include: {
              drama: true,
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      prisma.branchTask.count({ where }),
    ]);

    reply.send(success({
      items: items.map((item) => toClientBranchTask(item, baseUrl)),
      total,
      page,
      pageSize,
    }));
  });

  // GET /admin/branch-tasks/:taskId - get branch task detail with engagement context
  fastify.get('/admin/branch-tasks/:taskId', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const { taskId } = taskIdParamSchema.parse(request.params);

    const task = await prisma.branchTask.findUnique({
      where: { id: taskId },
      include: {
        episode: {
          include: {
            drama: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        comments: {
          where: { status: 'visible' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        likes: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!task) {
      reply.status(404).send({ code: 40004, message: 'branch task not found', data: null });
      return;
    }

    const durationMs = task.startedAt && task.finishedAt
      ? task.finishedAt.getTime() - task.startedAt.getTime()
      : null;

    reply.send(success({
      task: toClientBranchTask(task, baseUrl),
      comments: task.comments,
      likes: task.likes,
      durationMs,
    }));
  });

  // GET /admin/favorites - list persisted favorites with content filters
  fastify.get('/admin/favorites', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const query = adminFavoriteFilterSchema.parse(request.query);
    const { page, pageSize, dramaId, userId } = query;

    const where: Record<string, unknown> = {};
    if (dramaId) where.dramaId = dramaId;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.favoriteDrama.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { drama: true },
      }),
      prisma.favoriteDrama.count({ where }),
    ]);

    reply.send(success({
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        deviceId: item.deviceId,
        dramaId: item.dramaId,
        createdAt: item.createdAt,
        drama: toAdminDrama(item.drama, baseUrl),
      })),
      total,
      page,
      pageSize,
    }));
  });

  // GET /admin/player-comments - list playback comments with content filters
  fastify.get('/admin/player-comments', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const query = adminPlayerCommentFilterSchema.parse(request.query);
    const { page, pageSize, dramaId, episodeId, userId, status } = query;

    const where: Record<string, unknown> = {};
    if (episodeId) where.episodeId = episodeId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (dramaId) {
      where.episode = { is: { dramaId } };
    }

    const [items, total] = await Promise.all([
      prisma.playerComment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          episode: {
            include: {
              drama: true,
            },
          },
        },
      }),
      prisma.playerComment.count({ where }),
    ]);

    reply.send(success({
      items: items.map((item) => toAdminPlayerComment(item, baseUrl)),
      total,
      page,
      pageSize,
    }));
  });

  // GET /admin/danmaku - list playback danmaku with content filters
  fastify.get('/admin/danmaku', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const query = adminDanmakuFilterSchema.parse(request.query);
    const { page, pageSize, dramaId, episodeId, userId, status } = query;

    const where: Record<string, unknown> = {};
    if (episodeId) where.episodeId = episodeId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (dramaId) {
      where.episode = { is: { dramaId } };
    }

    const [items, total] = await Promise.all([
      prisma.danmakuMessage.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          episode: {
            include: {
              drama: true,
            },
          },
        },
      }),
      prisma.danmakuMessage.count({ where }),
    ]);

    reply.send(success({
      items: items.map((item) => toAdminDanmaku(item, baseUrl)),
      total,
      page,
      pageSize,
    }));
  });

  // GET /admin/watch-progress - list persisted watch progress with content filters
  fastify.get('/admin/watch-progress', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const query = adminWatchProgressFilterSchema.parse(request.query);
    const { page, pageSize, dramaId, episodeId, userId } = query;

    const where: Record<string, unknown> = {};
    if (dramaId) where.dramaId = dramaId;
    if (episodeId) where.episodeId = episodeId;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.watchProgress.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          drama: true,
          episode: true,
        },
      }),
      prisma.watchProgress.count({ where }),
    ]);

    reply.send(success({
      items: items.map((item) => toClientWatchProgress(item, baseUrl)),
      total,
      page,
      pageSize,
    }));
  });

  // POST /admin/branch-tasks/:taskId/retry - retry a failed/timeout task
  fastify.post('/admin/branch-tasks/:taskId/retry', async (request, reply) => {
    const { taskId } = taskIdParamSchema.parse(request.params);

    const task = await prisma.branchTask.findUnique({ where: { id: taskId } });
    if (!task) {
      reply.status(404).send({ code: 40004, message: 'branch task not found', data: null });
      return;
    }

    if (task.status !== 'failed' && task.status !== 'timeout') {
      reply.status(409).send({ code: 40009, message: 'can only retry failed or timeout tasks', data: null });
      return;
    }

    if (task.retryCount >= MAX_RETRY) {
      reply.status(409).send({ code: 40009, message: `max retries (${MAX_RETRY}) reached`, data: null });
      return;
    }

    const updated = await prisma.branchTask.update({
      where: { id: taskId },
      data: {
        status: 'pending',
        startedAt: null,
        finishedAt: null,
        failReason: '',
        pipelineStage: '',
        retryCount: { increment: 1 },
      },
    });

    reply.send(success(updated));
  });

  // POST /admin/episodes/:episodeId/branch-options/refresh - regenerate fixed branch options
  fastify.post('/admin/episodes/:episodeId/branch-options/refresh', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const { episodeId } = episodeIdParamSchema.parse(request.params);
    const refreshed = await refreshFixedBranchOptionsForEpisode(episodeId);

    reply.send(success({
      ...refreshed,
      options: refreshed.options.map((option) => ({
        ...option,
        resultContentPath: pathToUrl(option.resultContentPath, baseUrl),
        generatedPayloadPath: pathToUrl(option.generatedPayloadPath, baseUrl),
      })),
    }));
  });

  // GET /admin/episodes/:episodeId/branch-options - inspect fixed branch options with artifact diagnostics
  fastify.get('/admin/episodes/:episodeId/branch-options', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const { episodeId } = episodeIdParamSchema.parse(request.params);

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      reply.status(404).send({ code: 40004, message: 'episode not found', data: null });
      return;
    }

    if (!episode.isFinalEpisode) {
      reply.send(success([]));
      return;
    }

    const branchOptions = await prisma.branchOption.findMany({
      where: {
        episodeId,
        status: 'active',
      },
      orderBy: { sortIndex: 'asc' },
    });

    const inspections = await Promise.all(branchOptions.map((option) => inspectFixedBranchArtifact(option)));

    reply.send(success(
      branchOptions.map((option, index) => {
        const inspection = inspections[index];
        return {
          ...toClientBranchOption(
            option,
            baseUrl,
            inspection.artifact,
            inspection.relativePath || null,
          ),
          artifactStatus: inspection.status,
          artifactValid: inspection.isValid,
          artifactValidationMessage: formatFixedBranchArtifactStatus(inspection.status),
          artifactDiagnosticsJson: JSON.stringify({
            optionUpdatedAt: inspection.optionUpdatedAt,
            manifestSnapshot: inspection.manifestSnapshot,
            artifactSnapshot: inspection.artifactSnapshot,
            expectedSignature: inspection.expectedSignature,
            manifestSignature: inspection.manifestSignature,
            artifactSignature: inspection.artifactSignature,
          }),
        };
      }),
    ));
  });

  // POST /admin/demo/reset - reset runtime data
  fastify.post('/admin/demo/reset', async (_request, reply) => {
    await prisma.$transaction([
      prisma.interactionEvent.deleteMany(),
      prisma.highlightStats.deleteMany(),
      prisma.branchComment.deleteMany(),
      prisma.branchLike.deleteMany(),
      prisma.branchTask.deleteMany(),
      prisma.favoriteDrama.deleteMany(),
      prisma.playerComment.deleteMany(),
      prisma.danmakuMessage.deleteMany(),
      prisma.watchProgress.deleteMany(),
      prisma.userProfile.deleteMany(),
    ]);

    reply.send(success({ message: 'runtime data reset' }));
  });

  // GET /admin/assets/config - read current resource paths config
  fastify.get('/admin/assets/config', async (_request, reply) => {
    const configPath = getResourceConfigPath();

    let saved: Record<string, string> = {};
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      saved = JSON.parse(raw);
    } catch {
      // file doesn't exist yet, use defaults from runtime roots
    }

    reply.send(success({ saved, appliedRoots: getResourceRoots() }));
  });

  // POST /admin/assets/config - update resource paths config
  fastify.post('/admin/assets/config', async (request, reply) => {
    const body = assetsConfigSchema.parse(request.body);
    const configPath = getResourceConfigPath();

    let existing: Record<string, string> = {};
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      // file doesn't exist yet, start fresh
    }

    const merged = { ...existing, ...body };
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');

    const appliedRoots = getResourceRoots();
    reply.send(success({ saved: merged, appliedRoots }));
  });
}
