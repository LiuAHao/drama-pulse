import Fastify, { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { registerPlugins } from './registerPlugins.js';
import { registerRoutes } from './registerRoutes.js';
import { AppError } from '../shared/errors/index.js';
import { error } from '../shared/response/index.js';

export async function createApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  await registerPlugins(fastify);

  fastify.setErrorHandler((err, _request, reply) => {
    if (err instanceof AppError) {
      reply.status(err.statusCode).send(error(err.code, err.message));
      return;
    }

    if (err instanceof ZodError) {
      const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      reply.status(400).send(error(40001, message));
      return;
    }

    fastify.log.error(err);
    reply.status(500).send(error(50001, 'internal server error'));
  });

  await registerRoutes(fastify);

  return fastify;
}
