import { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/db';
import { success } from '../../shared/response';
import { AppError, ValidationError, NotFoundError } from '../../shared/errors';
import { userIdParamSchema, upsertWatchProgressSchema } from '../../shared/schemas';
import { assertUserMatchesDeviceId, getUserIdFromDeviceId, resolveDeviceId } from '../../services/userIdentity';
import { getBaseUrlFromRequest } from '../../services/resource/index.js';
import { toClientWatchProgress } from '../../services/clientPayload/index.js';

export async function progressRoutes(fastify: FastifyInstance) {
  // GET /users/:userId/watch-progress
  fastify.get('/users/:userId/watch-progress', async (request, reply) => {
    try {
      const baseUrl = getBaseUrlFromRequest(request);
      const parsed = userIdParamSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new ValidationError('invalid userId');
      }
      const headerDeviceId = request.headers['x-device-id'];
      const normalizedHeaderDeviceId = Array.isArray(headerDeviceId) ? headerDeviceId[0] : headerDeviceId;
      if (normalizedHeaderDeviceId) {
        assertUserMatchesDeviceId(parsed.data.userId, normalizedHeaderDeviceId);
      }

      const progresses = await prisma.watchProgress.findMany({
        where: { userId: parsed.data.userId },
        orderBy: { updatedAt: 'desc' },
        include: { drama: true, episode: true },
      });

      return reply.send(success(progresses.map((progress) => toClientWatchProgress(progress, baseUrl))));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(50001, 'failed to load watch progress', 500);
    }
  });

  // POST /users/:userId/watch-progress
  fastify.post('/users/:userId/watch-progress', async (request, reply) => {
    try {
      const paramParsed = userIdParamSchema.safeParse(request.params);
      if (!paramParsed.success) {
        throw new ValidationError('invalid userId');
      }

      const bodyParsed = upsertWatchProgressSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        throw new ValidationError(bodyParsed.error.issues.map((i) => i.message).join(', '));
      }

      const { deviceId: bodyDeviceId, episodeId, progressMs } = bodyParsed.data;
      const deviceId = resolveDeviceId(request, bodyDeviceId);
      const userId = assertUserMatchesDeviceId(paramParsed.data.userId, deviceId);

      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
      });
      if (!episode) {
        throw new NotFoundError('episode not found');
      }

      const record = await prisma.watchProgress.upsert({
        where: { userId_dramaId: { userId, dramaId: episode.dramaId } },
        update: { episodeId, progressMs, deviceId },
        create: { userId, deviceId, dramaId: episode.dramaId, episodeId, progressMs },
      });

      return reply.send(success(record));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(50001, 'failed to upsert watch progress', 500);
    }
  });
}
