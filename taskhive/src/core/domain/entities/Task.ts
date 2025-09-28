import { TaskId } from '../valueObjects/TaskId';
import { ProjectId } from '../valueObjects/ProjectId';
import { UserId } from '../valueObjects/UserId';
import { ValidationError } from '../../../shared/errors/DomainErrors';

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  COMPLETED = 'Completed', // Legacy compatibility
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export interface TaskData {
  id: number;
  name: string;
  contents?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee?: string;
  progress?: number;
  project_id: number;
  user_id?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskData {
  name: string;
  contents?: string;
  priority: TaskPriority;
  due_date?: string;
  assignee?: string;
  project_id: number;
}

export interface UpdateTaskData {
  name?: string;
  contents?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  assignee?: string;
  progress?: number;
}

export class TaskStatusTransitions {
  private static readonly validTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.DONE, TaskStatus.TODO],
    [TaskStatus.DONE]: [TaskStatus.TODO], // Allow reopening
    [TaskStatus.COMPLETED]: [TaskStatus.TODO], // Legacy support
  };

  static isValid(from: TaskStatus, to: TaskStatus): boolean {
    return this.validTransitions[from]?.includes(to) || false;
  }

  static getValidTransitions(from: TaskStatus): TaskStatus[] {
    return this.validTransitions[from] || [];
  }
}

export class Task {
  private constructor(
    private _id: number,
    private _name: string,
    private _status: TaskStatus,
    private _priority: TaskPriority,
    private _projectId: number,
    private _contents?: string,
    private _assignee?: string,
    private _dueDate?: Date,
    private _progress: number = 0,
    private _createdAt?: Date,
    private _updatedAt?: Date
  ) {}

  static create(data: CreateTaskData): Task {
    Task.validateName(data.name);
    Task.validateContents(data.contents);
    Task.validateAssignee(data.assignee);
    Task.validateDueDate(data.due_date);

    const dueDate = data.due_date ? new Date(data.due_date) : undefined;

    return new Task(
      0,
      data.name.trim(),
      TaskStatus.TODO,
      data.priority,
      data.project_id,
      data.contents?.trim(),
      data.assignee?.trim(),
      dueDate,
      0,
      new Date(),
      new Date()
    );
  }

  static fromData(data: TaskData): Task {
    const dueDate = data.due_date ? new Date(data.due_date) : undefined;
    const createdAt = data.createdAt ? new Date(data.createdAt) : undefined;
    const updatedAt = data.updatedAt ? new Date(data.updatedAt) : undefined;

    return new Task(
      data.id,
      data.name,
      data.status,
      data.priority,
      data.project_id,
      data.contents,
      data.assignee,
      dueDate,
      data.progress || 0,
      createdAt,
      updatedAt
    );
  }

  update(data: UpdateTaskData): void {
    if (data.name !== undefined) {
      Task.validateName(data.name);
      this._name = data.name.trim();
    }

    if (data.contents !== undefined) {
      Task.validateContents(data.contents);
      this._contents = data.contents?.trim();
    }

    if (data.status !== undefined) {
      this.changeStatus(data.status);
    }

    if (data.priority !== undefined) {
      this._priority = data.priority;
    }

    if (data.due_date !== undefined) {
      Task.validateDueDate(data.due_date);
      this._dueDate = data.due_date ? new Date(data.due_date) : undefined;
    }

    if (data.assignee !== undefined) {
      Task.validateAssignee(data.assignee);
      this._assignee = data.assignee?.trim();
    }

    if (data.progress !== undefined) {
      Task.validateProgress(data.progress);
      this._progress = data.progress;
    }

    this._updatedAt = new Date();
  }

  changeStatus(newStatus: TaskStatus): void {
    if (!TaskStatusTransitions.isValid(this._status, newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${this._status} to ${newStatus}`
      );
    }
    this._status = newStatus;
    this._updatedAt = new Date();

    // Auto-update progress based on status
    if (newStatus === TaskStatus.DONE || newStatus === TaskStatus.COMPLETED) {
      this._progress = 100;
    } else if (newStatus === TaskStatus.TODO) {
      this._progress = 0;
    }
  }

  updateProgress(progress: number): void {
    Task.validateProgress(progress);
    this._progress = progress;
    this._updatedAt = new Date();

    // Auto-update status based on progress
    if (progress === 100 && this._status !== TaskStatus.DONE) {
      this._status = TaskStatus.DONE;
    } else if (progress > 0 && progress < 100 && this._status === TaskStatus.TODO) {
      this._status = TaskStatus.IN_PROGRESS;
    } else if (progress === 0 && this._status !== TaskStatus.TODO) {
      this._status = TaskStatus.TODO;
    }
  }

  isOverdue(): boolean {
    if (!this._dueDate) return false;
    return this._dueDate < new Date() && this._status !== TaskStatus.DONE;
  }

  getDaysUntilDue(): number | null {
    if (!this._dueDate) return null;
    const now = new Date();
    const diffTime = this._dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getStatusColor(): string {
    switch (this._status) {
      case TaskStatus.TODO:
        return 'gray';
      case TaskStatus.IN_PROGRESS:
        return 'blue';
      case TaskStatus.DONE:
      case TaskStatus.COMPLETED:
        return 'green';
      default:
        return 'gray';
    }
  }

  getPriorityColor(): string {
    switch (this._priority) {
      case TaskPriority.LOW:
        return 'green';
      case TaskPriority.MEDIUM:
        return 'yellow';
      case TaskPriority.HIGH:
        return 'orange';
      case TaskPriority.CRITICAL:
        return 'red';
      default:
        return 'gray';
    }
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Task name is required');
    }

    if (name.length > 200) {
      throw new ValidationError('Task name cannot exceed 200 characters');
    }
  }

  private static validateContents(contents?: string): void {
    if (contents && contents.length > 5000) {
      throw new ValidationError('Task contents cannot exceed 5000 characters');
    }
  }

  private static validateAssignee(assignee?: string): void {
    if (assignee && assignee.trim().length === 0) {
      throw new ValidationError('Assignee cannot be empty string');
    }

    if (assignee && assignee.length > 100) {
      throw new ValidationError('Assignee name cannot exceed 100 characters');
    }
  }

  private static validateDueDate(dueDate?: string): void {
    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid due date format');
      }
    }
  }

  private static validateProgress(progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new ValidationError('Progress must be between 0 and 100');
    }

    if (!Number.isInteger(progress)) {
      throw new ValidationError('Progress must be an integer');
    }
  }

  // Getters for controlled access
  get id(): number { return this._id; }
  get name(): string { return this._name; }
  get contents(): string | undefined { return this._contents; }
  get status(): TaskStatus { return this._status; }
  get priority(): TaskPriority { return this._priority; }
  get assignee(): string | undefined { return this._assignee; }
  get dueDate(): Date | undefined { return this._dueDate; }
  get progress(): number { return this._progress; }
  get projectId(): number { return this._projectId; }
  get createdAt(): Date | undefined { return this._createdAt; }
  get updatedAt(): Date | undefined { return this._updatedAt; }

  toData(): TaskData {
    return {
      id: this._id,
      name: this._name,
      contents: this._contents,
      status: this._status,
      priority: this._priority,
      due_date: this._dueDate?.toISOString(),
      assignee: this._assignee,
      progress: this._progress,
      project_id: this._projectId,
      createdAt: this._createdAt?.toISOString(),
      updatedAt: this._updatedAt?.toISOString(),
    };
  }
}