import { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../../shared/db/index.js';
import { success } from '../../shared/response/index.js';
import {
  createDanmakuMessageSchema,
  createPlayerCommentSchema,
  optionalPaginationSchema,
  userIdParamSchema,
  userProfileSchema,
} from '../../shared/schemas/index.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import {
  assertUserMatchesDeviceId,
  getUserIdFromDeviceId,
  requireUserMatchesRequestDeviceId,
  resolveDeviceId,
} from '../../services/userIdentity/index.js';
import { getBaseUrlFromRequest } from '../../services/resource/index.js';
import { toClientDrama, toClientUserProfile } from '../../services/clientPayload/index.js';

function buildDefaultProfile(userId: string) {
  return {
    userId,
    nickname: `剧迷用户${userId.slice(-6)}`,
    bio: '爱看反转，也爱看上头瞬间',
    avatarUrl: null as string | null,
  };
}

function toClientPlayerComment(comment: {
  id: string
  userId: string
  deviceId: string
  episodeId: string
  content: string
  status: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: comment.id,
    userId: comment.userId,
    deviceId: comment.deviceId,
    episodeId: comment.episodeId,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

function toClientDanmakuMessage(message: {
  id: string
  userId: string
  deviceId: string
  episodeId: string
  content: string
  triggerPositionMs: number
  status: string
  createdAt: Date
  updatedAt: Date
}) {
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
  };
}

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:userId/profile', async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);
    requireUserMatchesRequestDeviceId(request, params.userId);

    const profile = await prisma.userProfile.findUnique({
      where: { userId: params.userId },
    });

    const watchCountPromise = prisma.watchProgress.count({
      where: { userId: params.userId },
    });
    const favoriteCountPromise = prisma.favoriteDrama.count({
      where: { userId: params.userId },
    });
    const branchCountPromise = prisma.branchTask.count({
      where: { userId: params.userId },
    });

    const [watchCount, favoriteCount, branchCount] = await Promise.all([
      watchCountPromise,
      favoriteCountPromise,
      branchCountPromise,
    ]);

    return reply.send(success({
      ...toClientUserProfile(profile ?? buildDefaultProfile(params.userId)),
      watchCount,
      favoriteCount,
      branchCount,
    }));
  });

  fastify.put('/users/:userId/profile', async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);
    const headerDeviceId = request.headers['x-device-id'];
    const normalizedHeaderDeviceId = Array.isArray(headerDeviceId) ? headerDeviceId[0] : headerDeviceId;
    if (!normalizedHeaderDeviceId) {
      throw new ValidationError('x-device-id is required');
    }
    assertUserMatchesDeviceId(params.userId, normalizedHeaderDeviceId);

    const bodyParsed = userProfileSchema.safeParse(request.body);
    if (!bodyParsed.success) {
      throw new ValidationError(bodyParsed.error.issues.map((issue) => issue.message).join(', '));
    }

    const saved = await prisma.userProfile.upsert({
      where: { userId: params.userId },
      update: {
        nickname: bodyParsed.data.nickname,
        bio: bodyParsed.data.bio,
        avatarUrl: bodyParsed.data.avatarUrl ?? null,
      },
      create: {
        userId: params.userId,
        nickname: bodyParsed.data.nickname,
        bio: bodyParsed.data.bio,
        avatarUrl: bodyParsed.data.avatarUrl ?? null,
      },
    });

    return reply.send(success(toClientUserProfile(saved)));
  });

  fastify.get('/users/:userId/favorites', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const params = userIdParamSchema.parse(request.params);
    requireUserMatchesRequestDeviceId(request, params.userId);

    const favorites = await prisma.favoriteDrama.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        drama: true,
      },
    });

    return reply.send(success({
      dramaIds: favorites.map((item) => item.dramaId),
      dramas: favorites.map((item) => toClientDrama(item.drama, baseUrl)),
    }));
  });

  fastify.put('/users/:userId/favorites/:dramaId', async (request, reply) => {
    const params = (request.params ?? {}) as { userId?: string; dramaId?: string };
    const parsed = userIdParamSchema.extend({ dramaId: userIdParamSchema.shape.userId }).safeParse(params);
    if (!parsed.success) {
      throw new ValidationError('invalid userId or dramaId');
    }

    const body = (request.body ?? {}) as { favorite?: boolean; deviceId?: string };
    if (typeof body.favorite !== 'boolean') {
      throw new ValidationError('favorite must be boolean');
    }

    const deviceId = resolveDeviceId(request, body.deviceId);
    const userId = assertUserMatchesDeviceId(parsed.data.userId, deviceId);

    const drama = await prisma.drama.findUnique({
      where: { id: parsed.data.dramaId },
      select: { id: true },
    });
    if (!drama) {
      throw new NotFoundError('drama not found');
    }

    if (body.favorite) {
      await prisma.favoriteDrama.upsert({
        where: {
          userId_dramaId: {
            userId,
            dramaId: parsed.data.dramaId,
          },
        },
        update: { deviceId },
        create: {
          userId,
          deviceId,
          dramaId: parsed.data.dramaId,
        },
      });
    } else {
      await prisma.favoriteDrama.deleteMany({
        where: {
          userId,
          dramaId: parsed.data.dramaId,
        },
      });
    }

    const favoriteCount = await prisma.favoriteDrama.count({
      where: { userId },
    });

    return reply.send(success({
      dramaId: parsed.data.dramaId,
      favorite: body.favorite,
      favoriteCount,
    }));
  });

  fastify.get('/episodes/:episodeId/comments', async (request, reply) => {
    const params = (request.params ?? {}) as { episodeId?: string };
    if (!params.episodeId) {
      throw new ValidationError('invalid episodeId');
    }
    const pagination = resolveEpisodeFeedPagination(request.query, 50);

    const episode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
      select: { id: true },
    });
    if (!episode) {
      throw new NotFoundError('episode not found');
    }

    const [comments, total] = await Promise.all([
      prisma.playerComment.findMany({
        where: {
          episodeId: params.episodeId,
          status: 'visible',
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.playerComment.count({
        where: {
          episodeId: params.episodeId,
          status: 'visible',
        },
      }),
    ]);

    applyPaginationHeaders(reply, pagination.page, pagination.pageSize, total);

    return reply.send(success(comments.map(toClientPlayerComment)));
  });

  fastify.post('/episodes/:episodeId/comments', async (request, reply) => {
    const params = (request.params ?? {}) as { episodeId?: string };
    if (!params.episodeId) {
      throw new ValidationError('invalid episodeId');
    }
    const bodyParsed = createPlayerCommentSchema.safeParse(request.body);
    if (!bodyParsed.success) {
      throw new ValidationError(bodyParsed.error.issues.map((issue) => issue.message).join(', '));
    }
    const { content, deviceId: bodyDeviceId } = bodyParsed.data;

    const deviceId = resolveDeviceId(request, bodyDeviceId);
    const userId = getUserIdFromDeviceId(deviceId);

    const episode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
      select: { id: true },
    });
    if (!episode) {
      throw new NotFoundError('episode not found');
    }

    const comment = await prisma.playerComment.create({
      data: {
        userId,
        deviceId,
        episodeId: params.episodeId,
        content,
        status: 'visible',
      },
    });

    return reply.send(success(toClientPlayerComment(comment)));
  });

  fastify.get('/episodes/:episodeId/danmaku', async (request, reply) => {
    const params = (request.params ?? {}) as { episodeId?: string };
    if (!params.episodeId) {
      throw new ValidationError('invalid episodeId');
    }
    const pagination = resolveEpisodeFeedPagination(request.query, 100);

    const episode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
      select: { id: true },
    });
    if (!episode) {
      throw new NotFoundError('episode not found');
    }

    const [danmaku, total] = await Promise.all([
      prisma.danmakuMessage.findMany({
        where: {
          episodeId: params.episodeId,
          status: 'visible',
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.danmakuMessage.count({
        where: {
          episodeId: params.episodeId,
          status: 'visible',
        },
      }),
    ]);

    applyPaginationHeaders(reply, pagination.page, pagination.pageSize, total);

    return reply.send(success(danmaku.map(toClientDanmakuMessage)));
  });

  fastify.post('/episodes/:episodeId/danmaku', async (request, reply) => {
    const params = (request.params ?? {}) as { episodeId?: string };
    if (!params.episodeId) {
      throw new ValidationError('invalid episodeId');
    }
    const bodyParsed = createDanmakuMessageSchema.safeParse(request.body);
    if (!bodyParsed.success) {
      throw new ValidationError(bodyParsed.error.issues.map((issue) => issue.message).join(', '));
    }
    const { content, triggerPositionMs, deviceId: bodyDeviceId } = bodyParsed.data;

    const deviceId = resolveDeviceId(request, bodyDeviceId);
    const userId = getUserIdFromDeviceId(deviceId);

    const episode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
      select: { id: true },
    });
    if (!episode) {
      throw new NotFoundError('episode not found');
    }

    const danmaku = await prisma.danmakuMessage.create({
      data: {
        userId,
        deviceId,
        episodeId: params.episodeId,
        content,
        triggerPositionMs: Math.floor(triggerPositionMs),
        status: 'visible',
      },
    });

    return reply.send(success(toClientDanmakuMessage(danmaku)));
  });
}

function resolveEpisodeFeedPagination(
  query: unknown,
  legacyPageSize: number,
) {
  const parsed = optionalPaginationSchema.safeParse(query ?? {});
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '));
  }
  const hasCustomPagination = parsed.data.page !== undefined || parsed.data.pageSize !== undefined;
  return {
    page: parsed.data.page ?? 1,
    pageSize: parsed.data.pageSize ?? (hasCustomPagination ? 20 : legacyPageSize),
  };
}

function applyPaginationHeaders(
  reply: FastifyReply,
  page: number,
  pageSize: number,
  total: number,
) {
  reply.header('x-total-count', total);
  reply.header('x-page', page);
  reply.header('x-page-size', pageSize);
  reply.header('x-total-pages', Math.max(1, Math.ceil(total / pageSize)));
}
