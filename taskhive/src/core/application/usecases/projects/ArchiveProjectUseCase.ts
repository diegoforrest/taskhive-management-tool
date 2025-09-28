import { Project } from '../../../domain/entities/Project';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ProjectId } from '../../../domain/valueObjects/ProjectId';

export interface ArchiveProjectRequest {
  projectId: number;
}

export interface ArchiveProjectResponse {
  success: boolean;
  project?: Project;
  message?: string;
}

export class ArchiveProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(request: ArchiveProjectRequest): Promise<ArchiveProjectResponse> {
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

      // Archive the project
      const archivedProject = await this.projectRepository.archive(projectId);

      return {
        success: true,
        project: archivedProject,
        message: 'Project archived successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to archive project'
      };
    }
  }
}