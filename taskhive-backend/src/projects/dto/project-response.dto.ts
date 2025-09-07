export class ProjectResponseDto {
  id: number;
  name: string;
  description: string;
  status: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  taskCount?: number;
  tasks?: any[];
}