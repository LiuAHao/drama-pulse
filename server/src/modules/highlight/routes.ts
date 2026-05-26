import { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/db/index.js';
import { ValidationError, NotFoundError } from '../../shared/errors/index.js';
import { success } from '../../shared/response/index.js';
import { episodeIdParamSchema, highlightIdParamSchema } from '../../shared/schemas/index.js';
import { toClientHighlight } from '../../services/clientPayload/index.js';

export async function highlightRoutes(fastify: FastifyInstance) {
  // GET /episodes/:episodeId/highlights
  fastify.get('/episodes/:episodeId/highlights', async (request, reply) => {
    const parsed = episodeIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      throw new ValidationError('invalid episodeId');
    }

    const { episodeId } = parsed.data;

    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      throw new NotFoundError('episode not found');
    }

    const highlights = await prisma.highlight.findMany({
      where: { episodeId, status: 'confirmed' },
      orderBy: { startTimeMs: 'asc' },
      include: { highlightStats: true },
    });

    const result = highlights.map((h) => toClientHighlight(h, h.highlightStats));

    return reply.send(success(result));
  });

  // GET /highlights/:highlightId/stats
  fastify.get('/highlights/:highlightId/stats', async (request, reply) => {
    const parsed = highlightIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      throw new ValidationError('invalid highlightId');
    }

    const { highlightId } = parsed.data;

    const highlight = await prisma.highlight.findUnique({ where: { id: highlightId } });
    if (!highlight) {
      throw new NotFoundError('highlight not found');
    }

    const stats = await prisma.highlightStats.findUnique({
      where: { highlightId },
    });

    const result = stats
      ? {
          totalCount: stats.totalCount,
          uniqueDeviceCount: stats.uniqueDeviceCount,
          heatLevel: stats.heatLevel,
          topOption: stats.topOption,
        }
      : {
          totalCount: 0,
          uniqueDeviceCount: 0,
          heatLevel: 0,
          topOption: '',
        };

    return reply.send(success(result));
  });
}
