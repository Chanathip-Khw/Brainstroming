const fastify = require('fastify')({ logger: true })

fastify.register(require('@fastify/cors'), {
  origin: 'http://localhost:3000'
})

fastify.get('/api/test', async () => {
  return { 
    status: 'OK', 
    message: 'Backend working!',
    time: new Date().toISOString()
  }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
    console.log('🚀 Backend running on http://localhost:3001')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()
