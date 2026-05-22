import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';

export async function registerPlugins(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  });
}
