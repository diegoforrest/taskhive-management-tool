import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../modules/users/entities/user.entity';

@Injectable()
export class UserManagementService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async updateProfile(
    userId: number, 
    updateData: Partial<{ email: string; firstName: string; lastName: string }>
  ): Promise<User> {
    const user = await this.findById(userId);
    
    const updateFields: Partial<User> = {};
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.firstName !== undefined) updateFields.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) updateFields.lastName = updateData.lastName;

    await this.userRepository.update(userId, updateFields);
    
    return this.findById(userId);
  }

  async getUserRoles(userId: number): Promise<string[]> {
    const user = await this.findById(userId);
    try {
      if (user && (user as any).roles) {
        const raw = (user as any).roles;
        return Array.isArray(raw) ? raw : JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error parsing user roles:', e);
    }
    return [];
  }

  async setUserRoles(userId: number, roles: string[]): Promise<void> {
    await this.userRepository.update(userId, { 
      roles: JSON.stringify(roles) 
    } as any);
  }

  async deactivateUser(userId: number): Promise<void> {
    await this.userRepository.update(userId, { isActive: false });
  }

  async activateUser(userId: number): Promise<void> {
    await this.userRepository.update(userId, { isActive: true });
  }
}