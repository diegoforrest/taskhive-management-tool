import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { TypeOrmModule } from '@nestjs/typeorm';
import logger, { log } from './logger';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('DB_HOST', 'localhost');
        const port = parseInt(configService.get('DB_PORT', '3306')) || 3306;
        const username = configService.get('DB_USERNAME', 'root');
        const password = configService.get('DB_PASSWORD', '');
        const database = configService.get('DB_NAME', 'taskhive_db');
        const synchronize = configService.get('NODE_ENV') !== 'production';
        const logging = configService.get('NODE_ENV') === 'development';

        const sslEnabled = (configService.get('DB_SSL') || 'false').toString().toLowerCase() === 'true';
        let extra: any = undefined;

        if (sslEnabled) {
          const caEnv = configService.get('DB_SSL_CA');
          const caPath = configService.get('DB_SSL_CA_PATH');
          // If user uploaded secret file to Render Secret Files but did not set DB_SSL_CA_PATH,
          // try the common Render path /etc/secrets/aiven_ca.pem automatically.
          let resolvedCaPath = caPath;
          const defaultRenderSecretPath = '/etc/secrets/aiven_ca.pem';
          if (!resolvedCaPath) {
            try {
              if (fs.existsSync(defaultRenderSecretPath)) {
                resolvedCaPath = defaultRenderSecretPath;
                log.log(`[DB] auto-detected CA path at ${resolvedCaPath}`);
              }
            } catch {
              // ignore
            }
          }
          log.log(`[DB] sslEnabled=${sslEnabled} caEnvPresent=${!!caEnv} caPath=${resolvedCaPath}`);
          const rejectEnv = (configService.get('DB_SSL_REJECT_UNAUTHORIZED') || 'true').toString().toLowerCase();
          const rejectUnauthorized = rejectEnv === 'true';
          let caValue: Buffer | undefined;

          if (caEnv) {
            // handle both literal newlines and escaped \n
            const normalized = caEnv.includes('\\n') ? caEnv.replace(/\\n/g, '\n') : caEnv.replace(/\r?\n/g, '\n');
            caValue = Buffer.from(normalized);
          } else if (resolvedCaPath) {
            // Log whether the secret file exists at the expected Render path
            try {
              const exists = fs.existsSync(resolvedCaPath);
              log.log(`[DB] CA path exists: ${resolvedCaPath} ${exists}`);
              if (exists) {
                caValue = fs.readFileSync(resolvedCaPath);
                log.log(`[DB] CA file loaded, bytes=${caValue.length}`);
              }
            } catch {
              log.warn(`[DB] Error checking/reading CA path ${caPath}`);
            }
          }

          if (caValue) {
            // mysql2/typeorm accept the CA as a string (PEM). Ensure we pass a utf8 string
            extra = { ssl: { ca: caValue.toString('utf8'), rejectUnauthorized } };
            log.log(`[DB] SSL enabled, CA loaded, rejectUnauthorized=${rejectUnauthorized}`);
          } else {
            // Pass an object; include rejectUnauthorized to allow temporary overrides for debugging
            extra = { ssl: { rejectUnauthorized } };
            log.log(`[DB] SSL enabled, no CA provided, rejectUnauthorized=${rejectUnauthorized}`);
          }
        } else {
          log.log('[DB] SSL disabled');
        }

        return {
          type: 'mysql',
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
          logging,
          ...(extra ? { extra } : {}),
        };
      },
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
