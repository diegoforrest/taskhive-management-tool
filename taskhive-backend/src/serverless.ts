import { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import serverless from 'serverless-http'
import { AppModule } from './app.module'

let cachedHandler: any = null

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule, { logger: false })
  app.setGlobalPrefix('') // noop – ensure routes map correctly
  await app.init()
  const expressApp = app.getHttpAdapter().getInstance()
  return serverless(expressApp)
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    // eslint-disable-next-line no-console
    console.log('Initializing Nest server for serverless handler...')
    cachedHandler = await bootstrap()
  }
  return cachedHandler(req, res)
}
