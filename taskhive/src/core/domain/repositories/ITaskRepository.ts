import { Task, CreateTaskData, UpdateTaskData, TaskStatus } from '../entities/Task';

export interface ITaskRepository {
  create(taskData: CreateTaskData): Promise<Task>;
  findById(id: number): Promise<Task | null>;
  findByProjectId(projectId: number): Promise<Task[]>;
  update(id: number, taskData: UpdateTaskData): Promise<Task>;
  updateStatus(id: number, status: TaskStatus): Promise<Task>;
  updateProgress(id: number, progress: number): Promise<Task>;
  delete(id: number): Promise<void>;
}

export interface TasksByStatus {
  [TaskStatus.TODO]: Task[];
  [TaskStatus.IN_PROGRESS]: Task[];
  [TaskStatus.DONE]: Task[];
}