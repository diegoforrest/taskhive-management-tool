import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { Password } from '../../../domain/valueObjects/Password';

export interface LoginUseCaseRequest {
  user_id: string;
  password: string;
}

export interface LoginUseCaseResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export class LoginUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(request: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
    try {
      // Validate password using domain value object
      new Password(request.password); // Will throw if invalid

      const { user, token } = await this.userRepository.login({
        user_id: request.user_id,
        password: request.password,
      });

      // Here we could add additional business logic:
      // - Update last login time
      // - Log login activity
      // - Check for account suspension
      // - etc.

      return { 
        success: true,
        user, 
        token,
        message: 'Login successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  }
}