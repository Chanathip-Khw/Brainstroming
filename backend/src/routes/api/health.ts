import { FastifyInstance } from 'fastify'
import { healthController } from '../../controllers/healthController'

export default async function (fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', healthController.check)
  
  // Detailed health check
  fastify.get('/api/health', healthController.detailed)
} 