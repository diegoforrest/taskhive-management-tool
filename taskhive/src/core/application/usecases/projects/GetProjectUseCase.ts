import { Project } from '../../../domain/entities/Project';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ProjectId } from '../../../domain/valueObjects/ProjectId';

export interface GetProjectRequest {
  projectId: number;
}

export interface GetProjectResponse {
  success: boolean;
  project?: Project;
  message?: string;
}

export class GetProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(request: GetProjectRequest): Promise<GetProjectResponse> {
    try {
      const projectId = new ProjectId(request.projectId);
      const project = await this.projectRepository.findById(projectId);

      if (!project) {
        return {
          success: false,
          message: 'Project not found'
        };
      }

      return {
        success: true,
        project,
        message: 'Project retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get project'
      };
    }
  }
}