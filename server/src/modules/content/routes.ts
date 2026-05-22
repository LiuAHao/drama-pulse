import { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/db';
import { success } from '../../shared/response';
import { AppError, NotFoundError, ValidationError } from '../../shared/errors';
import { dramaIdParamSchema, episodeIdParamSchema } from '../../shared/schemas';
import { getBaseUrlFromRequest, pathToUrl } from '../../services/resource';
import { getUserIdFromDeviceId } from '../../services/userIdentity';

export async function contentRoutes(fastify: FastifyInstance) {
  // GET /dramas - featured list, alternatives, and continue-watching
  fastify.get('/dramas', async (request, reply) => {
    try {
      const baseUrl = getBaseUrlFromRequest(request);
      const dramas = await prisma.drama.findMany({
        where: { status: 'active' },
        orderBy: { displayOrder: 'asc' },
      });

      const featured = dramas
        .filter((d) => d.isFeatured)
        .map((d) => ({ ...d, coverPath: pathToUrl(d.coverPath, baseUrl) }));

      const alternatives = dramas
        .filter((d) => !d.isFeatured)
        .map((d) => ({ ...d, coverPath: pathToUrl(d.coverPath, baseUrl) }));

      let continueWatching: {
        drama: (typeof featured)[0];
        episode: Awaited<ReturnType<typeof prisma.episode.findFirst>>;
        progressMs: number;
      } | null = null;

      const deviceId = request.headers['x-device-id'] as string | undefined;
      if (deviceId) {
        const userId = getUserIdFromDeviceId(deviceId);
        const progress = await prisma.watchProgress.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        });

        if (progress) {
          const drama = dramas.find((d) => d.id === progress.dramaId);
          if (drama) {
            const episode = await prisma.episode.findUnique({
              where: { id: progress.episodeId },
            });
            continueWatching = {
              drama: { ...drama, coverPath: pathToUrl(drama.coverPath, baseUrl) },
              episode,
              progressMs: progress.progressMs,
            };
          }
        }
      }

      return reply.send(success({ featured, alternatives, continueWatching }));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(50001, 'failed to load dramas', 500);
    }
  });

  // GET /dramas/:dramaId/episodes
  fastify.get('/dramas/:dramaId/episodes', async (request, reply) => {
    try {
      const baseUrl = getBaseUrlFromRequest(request);
      const parsed = dramaIdParamSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new ValidationError('invalid dramaId');
      }

      const episodes = await prisma.episode.findMany({
        where: { dramaId: parsed.data.dramaId, status: 'active' },
        orderBy: { episodeNo: 'asc' },
      });

      const mapped = episodes.map((ep) => ({
        ...ep,
        videoPath: pathToUrl(ep.videoPath, baseUrl),
      }));

      return reply.send(success(mapped));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(50001, 'failed to load episodes', 500);
    }
  });

  // GET /episodes/:episodeId
  fastify.get('/episodes/:episodeId', async (request, reply) => {
    try {
      const baseUrl = getBaseUrlFromRequest(request);
      const parsed = episodeIdParamSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new ValidationError('invalid episodeId');
      }

      const episode = await prisma.episode.findUnique({
        where: { id: parsed.data.episodeId },
        include: { drama: true },
      });

      if (!episode) {
        throw new NotFoundError('episode not found');
      }

      return reply.send(
        success({
          ...episode,
          videoPath: pathToUrl(episode.videoPath, baseUrl),
        }),
      );
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(50001, 'failed to load episode', 500);
    }
  });
}
