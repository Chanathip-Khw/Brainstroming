import { FastifyInstance } from 'fastify'
import authRoutes from './api/auth'
import workspaceRoutes from './api/workspaces'
import healthRoutes from './api/health'
import projectRoutes from './api/projects'

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Register all route groups
  await fastify.register(authRoutes)
  await fastify.register(workspaceRoutes)
  await fastify.register(healthRoutes)
  await fastify.register(projectRoutes)
} 