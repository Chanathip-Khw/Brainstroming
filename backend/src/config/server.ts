import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import 'dotenv/config'

export function createServer(): FastifyInstance {
  const fastify: FastifyInstance = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    }
  })

  return fastify
}

export async function registerPlugins(fastify: FastifyInstance): Promise<void> {
  // CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  })
} 