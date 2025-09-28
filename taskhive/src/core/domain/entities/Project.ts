import { ProjectId } from '../valueObjects/ProjectId';
import { UserId } from '../valueObjects/UserId';

export enum ProjectStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold',
  ARCHIVED = 'Archived',
}

export enum ProjectPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export interface ProjectData {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  due_date?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  due_date?: string;
  priority?: ProjectPriority;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  due_date?: string;
  priority?: ProjectPriority;
  status?: ProjectStatus;
  archived?: boolean;
}

export class Project {
  private constructor(
    private readonly _id: ProjectId,
    private _name: string,
    private readonly _userId: UserId,
    private _description: string | null,
    private _dueDate: Date | null,
    private _priority: ProjectPriority,
    private _status: ProjectStatus,
    private _archived: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(data: CreateProjectData, userId: UserId): Project {
    Project.validateName(data.name);
    Project.validateDescription(data.description);
    Project.validateDueDate(data.due_date);

    const dueDate = data.due_date ? new Date(data.due_date) : null;
    const now = new Date();

    return new Project(
      new ProjectId(0), // Will be set by database
      data.name.trim(),
      userId,
      data.description?.trim() || null,
      dueDate,
      data.priority || ProjectPriority.MEDIUM,
      ProjectStatus.TODO,
      false,
      now,
      now
    );
  }

  static fromData(data: ProjectData): Project {
    const id = new ProjectId(data.id);
    const userId = new UserId(data.user_id);
    const dueDate = data.due_date ? new Date(data.due_date) : null;
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

    // Parse priority and status with fallbacks
    const priority = Object.values(ProjectPriority).includes(data.priority as ProjectPriority) 
      ? data.priority as ProjectPriority 
      : ProjectPriority.MEDIUM;

    const status = Object.values(ProjectStatus).includes(data.status as ProjectStatus)
      ? data.status as ProjectStatus
      : ProjectStatus.TODO;

    return new Project(
      id,
      data.name,
      userId,
      data.description || null,
      dueDate,
      priority,
      status,
      false,
      createdAt,
      createdAt
    );
  }

  update(data: UpdateProjectData): void {
    if (data.name !== undefined) {
      Project.validateName(data.name);
      this._name = data.name.trim();
    }

    if (data.description !== undefined) {
      Project.validateDescription(data.description);
      this._description = data.description?.trim() || null;
    }

    if (data.due_date !== undefined) {
      Project.validateDueDate(data.due_date);
      this._dueDate = data.due_date ? new Date(data.due_date) : null;
    }

    if (data.priority !== undefined) {
      this._priority = data.priority;
    }

    if (data.status !== undefined) {
      this._status = data.status;
    }

    if (data.archived !== undefined) {
      this._archived = data.archived;
      if (data.archived) {
        this._status = ProjectStatus.ARCHIVED;
      }
    }

    this._updatedAt = new Date();
  }

  archive(): void {
    this._archived = true;
    this._status = ProjectStatus.ARCHIVED;
    this._updatedAt = new Date();
  }

  unarchive(): void {
    this._archived = false;
    if (this._status === ProjectStatus.ARCHIVED) {
      this._status = ProjectStatus.TODO;
    }
    this._updatedAt = new Date();
  }

  complete(): void {
    if (this._status === ProjectStatus.ARCHIVED) {
      throw new Error('Cannot complete an archived project');
    }
    this._status = ProjectStatus.COMPLETED;
    this._updatedAt = new Date();
  }

  isOverdue(): boolean {
    if (!this._dueDate || this._status === ProjectStatus.COMPLETED) return false;
    return this._dueDate < new Date();
  }

  getDaysUntilDue(): number | null {
    if (!this._dueDate) return null;
    const now = new Date();
    const diffTime = this._dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getStatusColor(): string {
    switch (this._status) {
      case ProjectStatus.TODO:
        return 'gray';
      case ProjectStatus.IN_PROGRESS:
        return 'blue';
      case ProjectStatus.COMPLETED:
        return 'green';
      case ProjectStatus.ON_HOLD:
        return 'yellow';
      case ProjectStatus.ARCHIVED:
        return 'gray';
      default:
        return 'gray';
    }
  }

  getPriorityColor(): string {
    switch (this._priority) {
      case ProjectPriority.LOW:
        return 'green';
      case ProjectPriority.MEDIUM:
        return 'yellow';
      case ProjectPriority.HIGH:
        return 'orange';
      case ProjectPriority.CRITICAL:
        return 'red';
      default:
        return 'gray';
    }
  }

  canBeDeleted(): boolean {
    // Only allow deletion of archived projects or projects in TODO status
    return this._archived || this._status === ProjectStatus.TODO;
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Project name is required');
    }

    if (name.length > 200) {
      throw new Error('Project name cannot exceed 200 characters');
    }
  }

  private static validateDescription(description?: string): void {
    if (description && description.length > 1000) {
      throw new Error('Project description cannot exceed 1000 characters');
    }
  }

  private static validateDueDate(dueDate?: string): void {
    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid due date format');
      }

      // Prevent setting due dates in the past
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (date < now) {
        throw new Error('Due date cannot be in the past');
      }
    }
  }

  // Getters for controlled access
  get id(): ProjectId { return this._id; }
  get name(): string { return this._name; }
  get description(): string | null { return this._description; }
  get userId(): UserId { return this._userId; }
  get dueDate(): Date | null { return this._dueDate; }
  get priority(): ProjectPriority { return this._priority; }
  get status(): ProjectStatus { return this._status; }
  get archived(): boolean { return this._archived; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  toData(): ProjectData {
    return {
      id: this._id.value,
      name: this._name,
      description: this._description || undefined,
      user_id: this._userId.value,
      due_date: this._dueDate?.toISOString(),
      priority: this._priority,
      status: this._status,
      createdAt: this._createdAt?.toISOString(),
    };
  }

  equals(other: Project): boolean {
    return this._id.equals(other._id);
  }
}