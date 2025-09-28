import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './roles.guard';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ChangeLog } from '../changelogs/entities/changelog.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { ChangelogsModule } from '../changelogs/changelogs.module';
import { UserManagementService, PasswordManagementService } from '../../application/services/user';

@Module({
	imports: [
		forwardRef(() => ProjectsModule),
		forwardRef(() => TasksModule),
		forwardRef(() => UsersModule),
		forwardRef(() => ChangelogsModule),
		TypeOrmModule.forFeature([User, Project, Task, ChangeLog, PasswordResetToken, RefreshToken]),
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				secret: configService.get<string>('JWT_SECRET'),
				signOptions: {
					expiresIn: configService.get<string>('JWT_EXPIRATION', '24h'),
				},
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy, RolesGuard, UserManagementService, PasswordManagementService],
	exports: [AuthService, JwtStrategy, RolesGuard, UserManagementService, PasswordManagementService],
})
export class AuthModule {}