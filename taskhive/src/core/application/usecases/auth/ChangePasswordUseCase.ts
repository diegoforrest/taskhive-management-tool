import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { UserId } from '../../../domain/valueObjects/UserId';
import { Password } from '../../../domain/valueObjects/Password';

export interface ChangePasswordRequest {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export class ChangePasswordUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    try {
      const userId = new UserId(request.userId);
      
      // Validate current password format
      new Password(request.currentPassword);
      
      // Validate new password format  
      new Password(request.newPassword);

      // Business rule: New password must be different from current
      if (request.currentPassword === request.newPassword) {
        return {
          success: false,
          message: 'New password must be different from the current password'
        };
      }

      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.userRepository.verifyPassword(userId, request.currentPassword);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Change password
      await this.userRepository.changePassword(userId, request.currentPassword, request.newPassword);

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to change password'
      };
    }
  }
}