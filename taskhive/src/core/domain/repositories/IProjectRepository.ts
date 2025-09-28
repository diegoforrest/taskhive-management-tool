import { Project, CreateProjectData, UpdateProjectData } from '../entities/Project';
import { ProjectId } from '../valueObjects/ProjectId';
import { UserId } from '../valueObjects/UserId';

export interface IProjectRepository {
  create(projectData: CreateProjectData, userId: UserId): Promise<Project>;
  findById(id: ProjectId): Promise<Project | null>;
  findByUserId(userId: UserId): Promise<Project[]>;
  update(id: ProjectId, projectData: UpdateProjectData): Promise<Project>;
  delete(id: ProjectId): Promise<void>;
  archive(id: ProjectId): Promise<Project>;
  unarchive(id: ProjectId): Promise<Project>;
  exists(id: ProjectId): Promise<boolean>;
}