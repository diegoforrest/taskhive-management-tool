import { Injectable } from '@nestjs/common';
import { UserManagementService } from '../../application/services/user/user-management.service';
import { PasswordManagementService } from '../../application/services/user/password-management.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly passwordManagementService: PasswordManagementService,
  ) {}

  getUserById(userId: number) {
    return this.userManagementService.findById(userId);
  }

  updateUser(userId: number, dto: any) {
    return this.userManagementService.updateProfile(userId, dto);
  }

  changePassword(userId: number, currentPassword: string, newPassword: string) {
    return this.passwordManagementService.changePassword(userId, currentPassword, newPassword);
  }

  verifyPassword(userId: number, password: string) {
    return this.passwordManagementService.verifyPassword(userId, password);
  }
}
