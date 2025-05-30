import { FastifyRequest } from 'fastify'

export interface AuthenticatedRequest extends FastifyRequest {
  currentUser?: {
    userId: string
    email: string
    name: string
    tokenSource?: 'backend' | 'nextauth'
    sessionId?: string
  }
} 