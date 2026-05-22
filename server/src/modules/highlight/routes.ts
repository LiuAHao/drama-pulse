import { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/db/index.js';
import { ValidationError, NotFoundError } from '../../shared/errors/index.js';
import { success } from '../../shared/response/index.js';
import { episodeIdParamSchema, highlightIdParamSchema } from '../../shared/schemas/index.js';

const DEFAULT_STATS = {
  totalCount: 0,
  uniqueDeviceCount: 0,
  heatLevel: 0,
  topOption: '',
};

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

    const result = highlights.map((h) => ({
      id: h.id,
      episodeId: h.episodeId,
      startTimeMs: h.startTimeMs,
      endTimeMs: h.endTimeMs,
      type: h.type,
      title: h.title,
      description: h.description,
      intensity: h.intensity,
      templateId: h.templateId,
      interactionOptionsJson: h.interactionOptionsJson,
      visualEffectType: h.visualEffectType,
      source: h.source,
      confidence: h.confidence,
      status: h.status,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
      stats: h.highlightStats
        ? {
            totalCount: h.highlightStats.totalCount,
            uniqueDeviceCount: h.highlightStats.uniqueDeviceCount,
            heatLevel: h.highlightStats.heatLevel,
            topOption: h.highlightStats.topOption,
          }
        : DEFAULT_STATS,
    }));

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
      : DEFAULT_STATS;

    return reply.send(success(result));
  });
}
