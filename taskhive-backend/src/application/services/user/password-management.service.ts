import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../../modules/users/entities/user.entity';
import { UserManagementService } from './user-management.service';

@Injectable()
export class PasswordManagementService {
  private readonly saltRounds = 12;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userManagementService: UserManagementService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePasswords(plaintext: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashed);
  }

  async changePassword(
    userId: number, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userManagementService.findById(userId);

    // Verify current password
    const passwordMatches = await this.comparePasswords(currentPassword, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash and update password
    const hashedPassword = await this.hashPassword(newPassword);
    await this.userRepository.update(userId, { password: hashedPassword });

    return { success: true, message: 'Password changed successfully' };
  }

  async verifyPassword(userId: number, password: string): Promise<{ valid: boolean }> {
    const user = await this.userManagementService.findById(userId);
    const valid = await this.comparePasswords(password, user.password);
    return { valid };
  }

  async setPassword(userId: number, newPassword: string): Promise<void> {
    this.validatePassword(newPassword);
    const hashedPassword = await this.hashPassword(newPassword);
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    
    // Add more password validation rules as needed
    if (!/(?=.*[a-z])/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
  }
}