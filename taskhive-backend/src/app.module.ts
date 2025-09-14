import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { TypeOrmModule } from '@nestjs/typeorm';
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
          let caValue: Buffer | undefined;

          if (caEnv) {
            // handle both literal newlines and escaped \n
            const normalized = caEnv.includes('\\n') ? caEnv.replace(/\\n/g, '\n') : caEnv.replace(/\r?\n/g, '\n');
            caValue = Buffer.from(normalized);
          } else if (caPath && fs.existsSync(caPath)) {
            caValue = fs.readFileSync(caPath);
          }

          if (caValue) {
            // mysql2/typeorm accept the CA as a string (PEM). Ensure we pass a utf8 string
            extra = { ssl: { ca: caValue.toString('utf8') } };
          } else {
            // Do not pass boolean true — mysql2 expects an object for ssl profile
            extra = { ssl: {} };
          }
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
