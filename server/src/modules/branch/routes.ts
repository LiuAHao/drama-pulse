import { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/db/index.js';
import { NotFoundError, StateError } from '../../shared/errors/index.js';
import { success } from '../../shared/response/index.js';
import {
  episodeIdParamSchema,
  taskIdParamSchema,
  userIdParamSchema,
  paginationSchema,
  createBranchTaskSchema,
  createBranchLikeSchema,
  createBranchCommentSchema,
} from '../../shared/schemas/index.js';
import { getUserIdFromDeviceId, requireUserMatchesRequestDeviceId, resolveDeviceId } from '../../services/userIdentity/index.js';
import { getBaseUrlFromRequest } from '../../services/resource/index.js';
import { toClientBranchOption, toClientBranchTask } from '../../services/clientPayload/index.js';
import { BRANCH_RESULT_SOURCE } from '../../services/branchTask/constants.js';
import { loadFixedBranchArtifact } from '../../services/branchTask/fixedBranchGenerator.js';

export async function branchRoutes(fastify: FastifyInstance) {
  // GET /episodes/:episodeId/branch-options
  fastify.get('/episodes/:episodeId/branch-options', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const params = episodeIdParamSchema.parse(request.params);

    const episode = await prisma.episode.findUnique({
      where: { id: params.episodeId },
    });

    if (!episode) {
      throw new NotFoundError('episode not found');
    }

    if (!episode.isFinalEpisode) {
      return reply.send(success([]));
    }

    const branchOptions = await prisma.branchOption.findMany({
      where: {
        episodeId: params.episodeId,
        status: 'active',
      },
      orderBy: { sortIndex: 'asc' },
    });

    const artifacts = await Promise.all(branchOptions.map((option) => loadFixedBranchArtifact(option)));

    const result = branchOptions.map((option, index) => {
      const payload = artifacts[index];
      return toClientBranchOption(
        option,
        baseUrl,
        payload?.artifact ?? null,
        payload?.relativePath ?? null,
      );
    });

    return reply.send(success(result));
  });

  // POST /branch-tasks
  fastify.post('/branch-tasks', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const body = createBranchTaskSchema.parse(request.body);
    const deviceId = resolveDeviceId(request, body.deviceId);

    const episode = await prisma.episode.findUnique({
      where: { id: body.episodeId },
    });

    if (!episode) {
      throw new NotFoundError('episode not found');
    }

    if (!episode.isFinalEpisode) {
      throw new StateError('branch tasks only allowed on final episodes');
    }

    const userId = getUserIdFromDeviceId(deviceId);

    const task = await prisma.branchTask.create({
      data: {
        userId,
        deviceId,
        episodeId: body.episodeId,
        userPrompt: body.userPrompt,
        resultSource: BRANCH_RESULT_SOURCE,
        status: 'pending',
      },
    });

    return reply.send(success(toClientBranchTask(task, baseUrl)));
  });

  // GET /branch-tasks/:taskId
  fastify.get('/branch-tasks/:taskId', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const params = taskIdParamSchema.parse(request.params);

    const task = await prisma.branchTask.findUnique({
      where: { id: params.taskId },
      include: {
        episode: {
          include: { drama: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('branch task not found');
    }

    return reply.send(success(toClientBranchTask(task, baseUrl)));
  });

  // GET /users/:userId/branch-tasks
  fastify.get('/users/:userId/branch-tasks', async (request, reply) => {
    const baseUrl = getBaseUrlFromRequest(request);
    const params = userIdParamSchema.parse(request.params);
    requireUserMatchesRequestDeviceId(request, params.userId);

    const tasks = await prisma.branchTask.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        episode: {
          include: { drama: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return reply.send(success(tasks.map((task) => toClientBranchTask(task, baseUrl))));
  });

  // POST /branch-tasks/:taskId/likes
  fastify.post('/branch-tasks/:taskId/likes', async (request, reply) => {
    const params = taskIdParamSchema.parse(request.params);
    const body = createBranchLikeSchema.parse(request.body);
    const deviceId = resolveDeviceId(request, body.deviceId);

    const task = await prisma.branchTask.findUnique({
      where: { id: params.taskId },
    });

    if (!task) {
      throw new NotFoundError('branch task not found');
    }

    const userId = getUserIdFromDeviceId(deviceId);

    // Idempotent: if already liked, just return success
    await prisma.branchLike.upsert({
      where: {
        branchTaskId_userId: {
          branchTaskId: params.taskId,
          userId,
        },
      },
      update: {},
      create: {
        branchTaskId: params.taskId,
        userId,
        deviceId,
      },
    });

    const likeCount = await prisma.branchLike.count({
      where: { branchTaskId: params.taskId },
    });

    return reply.send(success({ likeCount }));
  });

  // POST /branch-tasks/:taskId/comments
  fastify.post('/branch-tasks/:taskId/comments', async (request, reply) => {
    const params = taskIdParamSchema.parse(request.params);
    const body = createBranchCommentSchema.parse(request.body);
    const deviceId = resolveDeviceId(request, body.deviceId);

    const task = await prisma.branchTask.findUnique({
      where: { id: params.taskId },
    });

    if (!task) {
      throw new NotFoundError('branch task not found');
    }

    const userId = getUserIdFromDeviceId(deviceId);

    const comment = await prisma.branchComment.create({
      data: {
        branchTaskId: params.taskId,
        userId,
        deviceId,
        content: body.content,
        status: 'visible',
      },
    });

    return reply.send(success(comment));
  });

  // GET /branch-tasks/:taskId/comments
  fastify.get('/branch-tasks/:taskId/comments', async (request, reply) => {
    const params = taskIdParamSchema.parse(request.params);
    const query = paginationSchema.parse(request.query);

    const skip = (query.page - 1) * query.pageSize;

    const [comments, total] = await Promise.all([
      prisma.branchComment.findMany({
        where: {
          branchTaskId: params.taskId,
          status: 'visible',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      prisma.branchComment.count({
        where: {
          branchTaskId: params.taskId,
          status: 'visible',
        },
      }),
    ]);

    return reply.send(success({
      items: comments,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    }));
  });
}
