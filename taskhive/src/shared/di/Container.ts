// Core Domain Services
import { IUserRepository } from '../../core/domain/repositories/IUserRepository';
import { IProjectRepository } from '../../core/domain/repositories/IProjectRepository';
import { ITaskRepository } from '../../core/domain/repositories/ITaskRepository';

// Use Cases
import { LoginUseCase } from '../../core/application/usecases/auth/LoginUseCase';
import { ChangePasswordUseCase } from '../../core/application/usecases/auth/ChangePasswordUseCase';
import { CreateProjectUseCase } from '../../core/application/usecases/projects/CreateProjectUseCase';
import { GetProjectUseCase } from '../../core/application/usecases/projects/GetProjectUseCase';
import { GetProjectsByUserUseCase } from '../../core/application/usecases/projects/GetProjectsByUserUseCase';
import { UpdateProjectUseCase } from '../../core/application/usecases/projects/UpdateProjectUseCase';
import { DeleteProjectUseCase } from '../../core/application/usecases/projects/DeleteProjectUseCase';
import { GetTasksByProjectUseCase } from '../../core/application/usecases/tasks/GetTasksByProjectUseCase';
import { CreateTaskUseCase } from '../../core/application/usecases/task/CreateTaskUseCase';
import { UpdateTaskUseCase } from '../../core/application/usecases/task/UpdateTaskUseCase';
import { UpdateTaskStatusUseCase } from '../../core/application/usecases/task/UpdateTaskStatusUseCase';
import { DeleteTaskUseCase } from '../../core/application/usecases/task/DeleteTaskUseCase';

// Infrastructure
import { HttpUserRepository } from '../../core/infrastructure/repositories/HttpUserRepository';
import { HttpProjectRepository } from '../../core/infrastructure/repositories/HttpProjectRepository';
import { HttpTaskRepository } from '../../core/infrastructure/repositories/HttpTaskRepository';
import { AxiosHttpClient } from '../../core/infrastructure/http/HttpClient';
import { HttpClient } from '../../core/infrastructure/http/ApiResponse';

export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.registerServices();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  private registerServices(): void {
    // Create HTTP Client
    const httpClient: HttpClient = new AxiosHttpClient(
      process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'
    );

    // Register Repositories
    this.services.set('IUserRepository', new HttpUserRepository(httpClient));
    this.services.set('IProjectRepository', new HttpProjectRepository(httpClient));
    this.services.set('ITaskRepository', new HttpTaskRepository(httpClient));

    // Register Use Cases
    this.services.set('LoginUseCase', new LoginUseCase(this.get('IUserRepository')));
    this.services.set('ChangePasswordUseCase', new ChangePasswordUseCase(this.get('IUserRepository')));
    this.services.set('CreateProjectUseCase', new CreateProjectUseCase(this.get('IProjectRepository')));
    this.services.set('GetProjectUseCase', new GetProjectUseCase(this.get('IProjectRepository')));
    this.services.set('GetProjectsByUserUseCase', new GetProjectsByUserUseCase(this.get('IProjectRepository')));
    this.services.set('UpdateProjectUseCase', new UpdateProjectUseCase(this.get('IProjectRepository')));
    this.services.set('DeleteProjectUseCase', new DeleteProjectUseCase(this.get('IProjectRepository')));
    this.services.set('GetTasksByProjectUseCase', new GetTasksByProjectUseCase(this.get('ITaskRepository')));
    this.services.set('CreateTaskUseCase', new CreateTaskUseCase(this.get('ITaskRepository'), this.get('IProjectRepository')));
    this.services.set('UpdateTaskUseCase', new UpdateTaskUseCase(this.get('ITaskRepository')));
    this.services.set('UpdateTaskStatusUseCase', new UpdateTaskStatusUseCase(this.get('ITaskRepository')));
    this.services.set('DeleteTaskUseCase', new DeleteTaskUseCase(this.get('ITaskRepository')));
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in DI container`);
    }
    return service;
  }

  // Convenience methods for getting use cases
  getLoginUseCase(): LoginUseCase {
    return this.get('LoginUseCase');
  }

  getChangePasswordUseCase(): ChangePasswordUseCase {
    return this.get('ChangePasswordUseCase');
  }

  getCreateProjectUseCase(): CreateProjectUseCase {
    return this.get('CreateProjectUseCase');
  }

  getGetProjectUseCase(): GetProjectUseCase {
    return this.get('GetProjectUseCase');
  }

  getGetProjectsByUserUseCase(): GetProjectsByUserUseCase {
    return this.get('GetProjectsByUserUseCase');
  }

  getUpdateProjectUseCase(): UpdateProjectUseCase {
    return this.get('UpdateProjectUseCase');
  }

  getDeleteProjectUseCase(): DeleteProjectUseCase {
    return this.get('DeleteProjectUseCase');
  }

  getGetTasksByProjectUseCase(): GetTasksByProjectUseCase {
    return this.get('GetTasksByProjectUseCase');
  }

  getCreateTaskUseCase(): CreateTaskUseCase {
    return this.get('CreateTaskUseCase');
  }

  getUpdateTaskUseCase(): UpdateTaskUseCase {
    return this.get('UpdateTaskUseCase');
  }

  getUpdateTaskStatusUseCase(): UpdateTaskStatusUseCase {
    return this.get('UpdateTaskStatusUseCase');
  }

  getDeleteTaskUseCase(): DeleteTaskUseCase {
    return this.get('DeleteTaskUseCase');
  }

  // Convenience methods for getting repositories
  getUserRepository(): IUserRepository {
    return this.get('IUserRepository');
  }

  getProjectRepository(): IProjectRepository {
    return this.get('IProjectRepository');
  }

  getTaskRepository(): ITaskRepository {
    return this.get('ITaskRepository');
  }
}

// Export singleton instance
export const container = DIContainer.getInstance();