import { FastifyInstance } from 'fastify';
import { contentRoutes } from '../modules/content/routes.js';
import { highlightRoutes } from '../modules/highlight/routes.js';
import { interactionRoutes } from '../modules/interaction/routes.js';
import { branchRoutes } from '../modules/branch/routes.js';
import { progressRoutes } from '../modules/progress/routes.js';
import { adminRoutes } from '../modules/admin/routes.js';
import { assetsRoutes } from '../modules/assets/routes.js';

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(assetsRoutes);
  await fastify.register(contentRoutes);
  await fastify.register(highlightRoutes);
  await fastify.register(interactionRoutes);
  await fastify.register(branchRoutes);
  await fastify.register(progressRoutes);
  await fastify.register(adminRoutes);
}
