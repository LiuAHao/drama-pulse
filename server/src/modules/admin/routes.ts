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
} from '../../shared/schemas/index.js';
import { getBaseUrlFromRequest, getResourceConfigPath, getResourceRoots, pathToUrl, getResourceRoots as getRoots } from '../../services/resource/index.js';
import { toClientBranchTask, toClientDrama, toClientEpisode, toClientWatchProgress } from '../../services/clientPayload/index.js';
import fs from 'fs/promises';
import path from 'path';

const MAX_RETRY = 3;

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

    reply.send(success({ items, total, page, pageSize }));
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

    const updated = await prisma.highlight.update({
      where: { id: highlightId },
      data: {
        ...body,
        interactionStartMs,
        interactionAppearMs,
        interactionEndMs,
      },
    });

    reply.send(success(updated));
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
      ...highlightData,
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
        ...highlightData,
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

    reply.send(success({ items, total, page, pageSize }));
  });

  // GET /admin/branch-tasks - list branch tasks with filters, paginated
  fastify.get('/admin/branch-tasks', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const query = adminBranchTaskFilterSchema.parse(request.query);
    const { page, pageSize, status, episodeId, dramaId } = query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (episodeId) where.episodeId = episodeId;
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
        retryCount: { increment: 1 },
      },
    });

    reply.send(success(updated));
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
