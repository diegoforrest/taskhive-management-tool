import { User, CreateUserData, UpdateUserData } from '../entities/User';
import { UserId } from '../valueObjects/UserId';
import { Email } from '../valueObjects/Email';

export interface IUserRepository {
  create(userData: CreateUserData): Promise<User>;
  login(credentials: { user_id: string; password: string }): Promise<{ user: User; token: string }>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  update(id: UserId, userData: UpdateUserData): Promise<User>;
  changePassword(id: UserId, currentPassword: string, newPassword: string): Promise<void>;
  verifyPassword(id: UserId, password: string): Promise<boolean>;
  requestPasswordReset(email: Email): Promise<{ success: boolean; message: string; resetLink?: string }>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  resetPasswordWithTid(tid: number, token: string, newPassword: string): Promise<void>;
  exists(id: UserId): Promise<boolean>;
}