import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ProjectId } from '../../../domain/valueObjects/ProjectId';

export interface DeleteProjectRequest {
  projectId: number;
}

export interface DeleteProjectResponse {
  success: boolean;
  message?: string;
}

export class DeleteProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(request: DeleteProjectRequest): Promise<DeleteProjectResponse> {
    try {
      const projectId = new ProjectId(request.projectId);
      
      // Check if project exists
      const existingProject = await this.projectRepository.findById(projectId);
      if (!existingProject) {
        return {
          success: false,
          message: 'Project not found'
        };
      }

      // Delete the project
      await this.projectRepository.delete(projectId);

      return {
        success: true,
        message: 'Project deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete project'
      };
    }
  }
}