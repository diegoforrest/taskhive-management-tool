import { Project } from '../../../domain/entities/Project';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { UserId } from '../../../domain/valueObjects/UserId';

export interface GetProjectsByUserRequest {
  userId: number;
}

export interface GetProjectsByUserResponse {
  success: boolean;
  projects?: Project[];
  message?: string;
}

export class GetProjectsByUserUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(request: GetProjectsByUserRequest): Promise<GetProjectsByUserResponse> {
    try {
      const userId = new UserId(request.userId);
      const projects = await this.projectRepository.findByUserId(userId);

      return {
        success: true,
        projects,
        message: 'Projects retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get projects'
      };
    }
  }
}