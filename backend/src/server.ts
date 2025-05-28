import { createServer, registerPlugins } from './config/server'
import { registerRoutes } from './routes'
import { prisma } from './config/database'
import 'dotenv/config'

const fastify = createServer()

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, closing server...`)
  try {
    await prisma.$disconnect()
    await fastify.close()
    process.exit(0)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

// Start server
async function start() {
  try {
    // Register plugins first
    await registerPlugins(fastify)
    
    // Then register routes
    await registerRoutes(fastify)
    
    // Start listening
    await fastify.listen({ 
      port: parseInt(process.env.PORT || '3001'), 
      host: process.env.HOST || '0.0.0.0' 
    })
    
    const address = fastify.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    fastify.log.info(`Server listening on port ${port}`);
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Start the server
start()