import { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import serverless from 'serverless-http'
import { AppModule } from './app.module'

let cachedHandler: any = null
let cachedError: any = null

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule, { logger: false })
  app.setGlobalPrefix('') // noop – ensure routes map correctly
  await app.init()
  const expressApp = app.getHttpAdapter().getInstance()
  return serverless(expressApp)
}

// Capture unexpected errors so they show up in logs
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection at:', reason)
})
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught Exception thrown:', err)
})

export default async function handler(req: any, res: any) {
  // fast-path health check so we can validate the function without booting Nest
  try {
    const url = req && (req.url || req.path)
    if (url === '/health' || url === '/_health' || url === '/ping') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }
  } catch (e) {
    // ignore health path parse errors
  }
  if (!cachedHandler && !cachedError) {
    // eslint-disable-next-line no-console
    console.log('Initializing Nest server for serverless handler...')
    try {
      cachedHandler = await bootstrap()
    } catch (err: any) {
      cachedError = err
      // eslint-disable-next-line no-console
      console.error('Failed to initialize Nest server:', err && err.stack ? err.stack : err)
      // include some additional hints for common failures
      if (err && err.message && (err.message.toLowerCase().includes('connect') || err.message.toLowerCase().includes('timeout') || err.message.toLowerCase().includes('auth'))) {
        console.error('Hint: database connection likely failed. Check DB env vars (DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_SSL, DB_SSL_CA) in Vercel project settings and ensure the Vercel deployment can reach your Aiven database.');
      }
    }
  }

  if (cachedError) {
    // Return a simple 500 response with limited info (avoid leaking secrets)
    try {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Server initialization failed', message: cachedError?.message || 'unknown' }))
      return
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error while sending error response:', e)
      // If response fails, throw to surface the error to the platform
      throw cachedError
    }
  }

  return cachedHandler(req, res)
}
