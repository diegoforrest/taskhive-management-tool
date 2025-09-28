import { Project, CreateProjectData } from '../../../domain/entities/Project';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { UserId } from '../../../domain/valueObjects/UserId';

export interface CreateProjectRequest {
  name: string;
  description?: string;
  priority?: string;
  due_date?: string;
  userId: number;
}

export interface CreateProjectResponse {
  success: boolean;
  project?: Project;
  message?: string;
}

export class CreateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(request: CreateProjectRequest): Promise<CreateProjectResponse> {
    try {
      const userId = new UserId(request.userId);
      
      // Create project using domain entity factory
      const project = Project.create({
        name: request.name,
        description: request.description,
        priority: request.priority as any,
        due_date: request.due_date
      }, userId);

      // Save through repository
      const createData: CreateProjectData = {
        name: request.name,
        description: request.description,
        priority: request.priority as any,
        due_date: request.due_date
      };
      
      const savedProject = await this.projectRepository.create(createData, userId);

      return {
        success: true,
        project: savedProject,
        message: 'Project created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create project'
      };
    }
  }
}