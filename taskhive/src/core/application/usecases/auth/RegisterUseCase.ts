import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';

export interface RegisterUseCaseRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterUseCaseResponse {
  user: User;
  message: string;
}

export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(request: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
    // Validate request data through User entity creation
    User.create(request);

    // Save to repository
    const savedUser = await this.userRepository.create(request);

    return {
      user: savedUser,
      message: 'User registered successfully',
    };
  }
}