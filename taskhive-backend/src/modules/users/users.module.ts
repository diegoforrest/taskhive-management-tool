import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserManagementService } from '../../application/services/user/user-management.service';
import { PasswordManagementService } from '../../application/services/user/password-management.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UserManagementService, PasswordManagementService],
  exports: [UsersService, UserManagementService, PasswordManagementService],
})
export class UsersModule {}
