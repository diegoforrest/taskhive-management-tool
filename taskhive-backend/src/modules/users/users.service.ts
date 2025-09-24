import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(private readonly authService: AuthService) {}

  getUserById(userId: number) {
    return this.authService.findById(userId);
  }

  updateUser(userId: number, dto: any) {
    return this.authService.updateUser(userId, dto);
  }

  changePassword(userId: number, currentPassword: string, newPassword: string) {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  verifyPassword(userId: number, password: string) {
    return this.authService.verifyPassword(userId, password);
  }
}
