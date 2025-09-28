import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import logger, { log } from './logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  

  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      log.warn(`Blocked CORS request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  log.log(`Allowed CORS origins: ${JSON.stringify(allowedOrigins)}`);

  // Enable global validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Add security headers in production
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  log.log(`🚀 TaskHive Backend running on http://localhost:${port}`);
}
bootstrap();
