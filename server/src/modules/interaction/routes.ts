import { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/db/index.js';
import { ValidationError, NotFoundError } from '../../shared/errors/index.js';
import { success } from '../../shared/response/index.js';
import { createInteractionSchema } from '../../shared/schemas/index.js';
import { getUserIdFromDeviceId, resolveDeviceId } from '../../services/userIdentity/index.js';
import { recalculateHighlightStats } from '../../services/stats/index.js';

export async function interactionRoutes(fastify: FastifyInstance) {
  // POST /interactions
  fastify.post('/interactions', async (request, reply) => {
    const parsed = createInteractionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join('; '));
    }

    const { deviceId: bodyDeviceId, episodeId, highlightId, interactionType, optionText, clientTimestamp } = parsed.data;
    const deviceId = resolveDeviceId(request, bodyDeviceId);

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { id: true, episodeId: true, episode: { select: { dramaId: true } } },
    });
    if (!highlight) {
      throw new NotFoundError('highlight not found');
    }
    if (highlight.episodeId !== episodeId) {
      throw new ValidationError('episodeId does not match highlight');
    }

    const userId = getUserIdFromDeviceId(deviceId);

    await prisma.interactionEvent.create({
      data: {
        userId,
        deviceId,
        dramaId: highlight.episode.dramaId,
        episodeId,
        highlightId,
        interactionType,
        optionText,
        clientTimestamp,
      },
    });

    await recalculateHighlightStats(highlightId);

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
      : { totalCount: 0, uniqueDeviceCount: 0, heatLevel: 0, topOption: '' };

    return reply.send(success(result));
  });
}
