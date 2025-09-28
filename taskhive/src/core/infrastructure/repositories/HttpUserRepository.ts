import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserData, CreateUserData, UpdateUserData } from '../../domain/entities/User';
import { UserId } from '../../domain/valueObjects/UserId';
import { Email } from '../../domain/valueObjects/Email';
import { HttpClient } from '../http/ApiResponse';

interface LoginResponse {
  success: boolean;
  user?: UserData;
  access_token?: string;
  token?: string;
  message?: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  user_id?: number;
  email?: string;
}

export class HttpUserRepository implements IUserRepository {
  constructor(private httpClient: HttpClient) {}

  async create(userData: CreateUserData): Promise<User> {
    const response = await this.httpClient.post<RegisterResponse>('/test01/create_member', {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });

    // Handle the response which might be wrapped in ApiResponse or direct
    const responseData = (response as any).data || response;
    if (!responseData.success || !responseData.user_id) {
      throw new Error(responseData.message || 'Failed to create user');
    }

    // Create user object with the returned ID
    const userDataResponse: UserData = {
      user_id: responseData.user_id,
      email: responseData.email || userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    };

    return User.fromData(userDataResponse);
  }

  async login(credentials: { user_id: string; password: string }): Promise<{ user: User; token: string }> {
    const response = await this.httpClient.post<LoginResponse>('/testlogin', credentials);

    // Handle the response which might be wrapped in ApiResponse or direct
    const responseData = (response as any).data || response;
    if (!responseData.success || !responseData.user) {
      throw new Error(responseData.message || 'Login failed');
    }

    // Handle both access_token and token fields
    const token = responseData.token || responseData.access_token;
    if (!token) {
      throw new Error('No authentication token received');
    }

    const user = User.fromData(responseData.user);
    return { user, token };
  }

  async findById(id: UserId): Promise<User | null> {
    try {
      // Use the /users/me endpoint to get current user info
      const response = await this.httpClient.get<UserData>('/users/me');
      const responseData = (response as any).data || response;
      
      if (!responseData || !responseData.user_id) {
        return null;
      }

      return User.fromData(responseData);
    } catch {
      return null;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      // This would require a user lookup endpoint
      throw new Error('findByEmail not implemented - requires user lookup endpoint');
    } catch {
      return null;
    }
  }

  async update(id: UserId, userData: UpdateUserData): Promise<User> {
    const response = await this.httpClient.post<UserData>(`/users/update`, userData);

    // Handle the response which might be wrapped in ApiResponse or direct
    const responseData = (response as any).data || response;
    if (!responseData || !responseData.user_id) {
      throw new Error('Failed to update user');
    }

    return User.fromData(responseData);
  }

  async changePassword(id: UserId, currentPassword: string, newPassword: string): Promise<void> {
    const response = await this.httpClient.post(`/test12/change_password/${id.value}`, {
      currentPassword,
      newPassword,
    });

    const responseData = (response as any).data || response;
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to change password');
    }
  }

  async verifyPassword(id: UserId, password: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post<{ valid: boolean }>(`/test13/verify_password/${id.value}`, {
        password,
      });

      const responseData = (response as any).data || response;
      return responseData.valid || false;
    } catch {
      return false;
    }
  }

  async requestPasswordReset(email: Email): Promise<{ success: boolean; message: string; resetLink?: string }> {
    try {
      const response = await this.httpClient.post<{ success: boolean; message: string; resetLink?: string }>('/test14/forgot_password', {
        email: email.value,
      });

      const responseData = (response as any).data || response;
      return {
        success: responseData.success || false,
        message: responseData.message || 'Password reset request processed',
        resetLink: responseData.resetLink,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to request password reset',
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await this.httpClient.post('/test15/reset_password', {
      token,
      newPassword,
    });

    const responseData = (response as any).data || response;
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to reset password');
    }
  }

  async resetPasswordWithTid(tid: number, token: string, newPassword: string): Promise<void> {
    const response = await this.httpClient.post('/test15/reset_password', {
      tid,
      token,
      newPassword,
    });

    const responseData = (response as any).data || response;
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to reset password');
    }
  }

  async exists(id: UserId): Promise<boolean> {
    try {
      const user = await this.findById(id);
      return user !== null;
    } catch {
      return false;
    }
  }
}