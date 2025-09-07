export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export class TaskResponseDto {
  task_id: number;
  name: string;
  contents: string;
  status: TaskStatus;
  project_id: number;
  createdAt: Date;
  updatedAt: Date;
}