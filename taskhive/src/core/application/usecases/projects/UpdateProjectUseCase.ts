import { Project, UpdateProjectData } from '../../../domain/entities/Project';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { ProjectId } from '../../../domain/valueObjects/ProjectId';

export interface UpdateProjectRequest {
  projectId: number;
  name?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  status?: string;
}

export interface UpdateProjectResponse {
  success: boolean;
  project?: Project;
  message?: string;
}

export class UpdateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(request: UpdateProjectRequest): Promise<UpdateProjectResponse> {
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

      // Prepare update data
      const updateData: UpdateProjectData = {};
      if (request.name !== undefined) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.priority !== undefined) updateData.priority = request.priority as any;
      if (request.due_date !== undefined) updateData.due_date = request.due_date;
      if (request.status !== undefined) updateData.status = request.status as any;

      // Update the project
      const updatedProject = await this.projectRepository.update(projectId, updateData);

      return {
        success: true,
        project: updatedProject,
        message: 'Project updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update project'
      };
    }
  }
}