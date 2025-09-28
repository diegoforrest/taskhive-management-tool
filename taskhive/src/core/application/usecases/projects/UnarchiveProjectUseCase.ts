import { Project } from '../../../domain/entities/Project';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ProjectId } from '../../../domain/valueObjects/ProjectId';

export interface UnarchiveProjectRequest {
  projectId: number;
}

export interface UnarchiveProjectResponse {
  success: boolean;
  project?: Project;
  message?: string;
}

export class UnarchiveProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(request: UnarchiveProjectRequest): Promise<UnarchiveProjectResponse> {
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

      // Unarchive the project
      const unarchivedProject = await this.projectRepository.unarchive(projectId);

      return {
        success: true,
        project: unarchivedProject,
        message: 'Project unarchived successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to unarchive project'
      };
    }
  }
}