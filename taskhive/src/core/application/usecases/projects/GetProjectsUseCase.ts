import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { Project } from '../../../domain/entities/Project';
import { UserId } from '../../../domain/valueObjects/UserId';

export interface GetProjectsResponse {
  success: boolean;
  projects: Project[];
  message?: string;
}

export class GetProjectsUseCase {
  constructor(private projectRepository: IProjectRepository) {}

  async execute(userId: number): Promise<GetProjectsResponse> {
    try {
      const userIdVO = new UserId(userId);
      const projects = await this.projectRepository.findByUserId(userIdVO);
      
      return {
        success: true,
        projects,
        message: 'Projects retrieved successfully'
      };
    } catch (error) {
      console.error('GetProjectsUseCase error:', error);
      return {
        success: false,
        projects: [],
        message: error instanceof Error ? error.message : 'Failed to retrieve projects'
      };
    }
  }
}