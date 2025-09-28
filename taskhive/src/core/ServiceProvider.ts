import { AxiosHttpClient } from './infrastructure/http/HttpClient';
import { HttpUserRepository } from './infrastructure/repositories/HttpUserRepository';
import { HttpProjectRepository } from './infrastructure/repositories/HttpProjectRepository';
import { HttpTaskRepository } from './infrastructure/repositories/HttpTaskRepository';
import { InMemoryCache } from './infrastructure/cache/InMemoryCache';
import { QueryClient } from './infrastructure/cache/QueryClient';
import { LoginUseCase } from './application/usecases/auth/LoginUseCase';
import { RegisterUseCase } from './application/usecases/auth/RegisterUseCase';
import { CreateTaskUseCase } from './application/usecases/task/CreateTaskUseCase';
import { UpdateTaskStatusUseCase } from './application/usecases/task/UpdateTaskStatusUseCase';
import { UpdateTaskUseCase } from './application/usecases/task/UpdateTaskUseCase';
import { DeleteTaskUseCase } from './application/usecases/task/DeleteTaskUseCase';

interface ServiceContainer {
  // Infrastructure
  httpClient: AxiosHttpClient;
  cache: InMemoryCache;
  queryClient: QueryClient;
  
  // Repositories
  userRepository: HttpUserRepository;
  projectRepository: HttpProjectRepository;
  taskRepository: HttpTaskRepository;
  
  // Use Cases
  loginUseCase: LoginUseCase;
  registerUseCase: RegisterUseCase;
  createTaskUseCase: CreateTaskUseCase;
  updateTaskStatusUseCase: UpdateTaskStatusUseCase;
  updateTaskUseCase: UpdateTaskUseCase;
  deleteTaskUseCase: DeleteTaskUseCase;
}

export class ServiceProvider {
  private static instance: ServiceProvider;
  private services: ServiceContainer;

  private constructor() {
    // Initialize infrastructure
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const httpClient = new AxiosHttpClient(apiBaseUrl);
    const cache = new InMemoryCache();
    const queryClient = new QueryClient(cache);

    // Start cache cleanup
    cache.startCleanup();

    // Initialize repositories
    const userRepository = new HttpUserRepository(httpClient);
    const projectRepository = new HttpProjectRepository(httpClient);
    const taskRepository = new HttpTaskRepository(httpClient);

    // Initialize use cases
    const loginUseCase = new LoginUseCase(userRepository);
    const registerUseCase = new RegisterUseCase(userRepository);
    const createTaskUseCase = new CreateTaskUseCase(taskRepository, projectRepository);
    const updateTaskStatusUseCase = new UpdateTaskStatusUseCase(taskRepository);
    const updateTaskUseCase = new UpdateTaskUseCase(taskRepository);
    const deleteTaskUseCase = new DeleteTaskUseCase(taskRepository);

    this.services = {
      httpClient,
      cache,
      queryClient,
      userRepository,
      projectRepository,
      taskRepository,
      loginUseCase,
      registerUseCase,
      createTaskUseCase,
      updateTaskStatusUseCase,
      updateTaskUseCase,
      deleteTaskUseCase,
    };
  }

  static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  getServices(): ServiceContainer {
    return this.services;
  }

  // Convenience methods for common services
  getHttpClient(): AxiosHttpClient {
    return this.services.httpClient;
  }

  getQueryClient(): QueryClient {
    return this.services.queryClient;
  }

  getUserRepository(): HttpUserRepository {
    return this.services.userRepository;
  }

  getProjectRepository(): HttpProjectRepository {
    return this.services.projectRepository;
  }

  getTaskRepository(): HttpTaskRepository {
    return this.services.taskRepository;
  }

  // Use case getters
  getLoginUseCase(): LoginUseCase {
    return this.services.loginUseCase;
  }

  getRegisterUseCase(): RegisterUseCase {
    return this.services.registerUseCase;
  }

  getCreateTaskUseCase(): CreateTaskUseCase {
    return this.services.createTaskUseCase;
  }

  getUpdateTaskStatusUseCase(): UpdateTaskStatusUseCase {
    return this.services.updateTaskStatusUseCase;
  }

  getUpdateTaskUseCase(): UpdateTaskUseCase {
    return this.services.updateTaskUseCase;
  }

  getDeleteTaskUseCase(): DeleteTaskUseCase {
    return this.services.deleteTaskUseCase;
  }

  // Authentication token management
  setAuthToken(token: string | null): void {
    this.services.httpClient.setAuthToken(token);
  }
}

// Export singleton instance
export const serviceProvider = ServiceProvider.getInstance();