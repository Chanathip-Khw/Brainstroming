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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  // Ensure the frontend URL includes protocol for CORS
  const corsOrigin = frontendUrl.startsWith('http') ? frontendUrl : `https://${frontendUrl}`
  
  await fastify.register(cors, {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  })
  
  // Add custom content type parser to handle empty JSON bodies
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    if (body === '') {
      done(null, {})
    } else {
      try {
        const json = JSON.parse(body as string)
        done(null, json)
      } catch (err: any) {
        err.statusCode = 400
        done(err, undefined)
      }
    }
  })
} 