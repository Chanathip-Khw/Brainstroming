import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../config/database'

export const healthController = {
  // Basic health check
  check: async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      authentication: 'NextAuth Integration',
      database: 'AWS RDS MySQL'
    }
  },

  // Detailed health check
  detailed: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await prisma.$connect()
      const userCount = await prisma.user.count()
      
      return {
        status: 'OK',
        message: 'Backend API with NextAuth integration is running!',
        database: {
          status: 'connected',
          userCount
        },
        authentication: 'NextAuth Integration',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'ERROR',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
} 