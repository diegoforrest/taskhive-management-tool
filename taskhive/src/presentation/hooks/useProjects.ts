import { useState, useCallback } from 'react';
import { container } from '../../shared/di/Container';
import { Project } from '../../core/domain/entities/Project';
import { CreateProjectRequest } from '../../core/application/usecases/projects/CreateProjectUseCase';
import { GetProjectRequest } from '../../core/application/usecases/projects/GetProjectUseCase';
import { UpdateProjectRequest } from '../../core/application/usecases/projects/UpdateProjectUseCase';
import { DeleteProjectRequest } from '../../core/application/usecases/projects/DeleteProjectUseCase';

export interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

export function useProjects() {
  const [projectsState, setProjectsState] = useState<ProjectsState>({
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null
  });

  const createProject = useCallback(async (request: CreateProjectRequest) => {
    setProjectsState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const createProjectUseCase = container.getCreateProjectUseCase();
      const result = await createProjectUseCase.execute(request);

      if (result.success && result.project) {
        setProjectsState(prev => ({
          ...prev,
          projects: [...prev.projects, result.project!],
          isLoading: false,
          error: null
        }));
        
        return { success: true, project: result.project };
      } else {
        setProjectsState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Failed to create project' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setProjectsState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to create project' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const loadProjects = useCallback(async (userId: number) => {
    setProjectsState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // For now, we'll use the repository directly
      // In a complete implementation, we'd have a GetProjectsUseCase
      const projectRepository = container.getProjectRepository();
      const projects = await projectRepository.findByUserId(new (await import('../../core/domain/valueObjects/UserId')).UserId(userId));

      setProjectsState({
        projects,
        currentProject: null,
        isLoading: false,
        error: null
      });
      
      return { success: true, projects };
    } catch (error: any) {
      setProjectsState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to load projects' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const getProject = useCallback(async (projectId: number) => {
    setProjectsState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const getProjectUseCase = container.getGetProjectUseCase();
      const result = await getProjectUseCase.execute({ projectId });

      if (result.success && result.project) {
        setProjectsState(prev => ({
          ...prev,
          currentProject: result.project!,
          isLoading: false,
          error: null
        }));
        
        return { success: true, project: result.project };
      } else {
        setProjectsState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Failed to get project' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setProjectsState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to get project' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const updateProject = useCallback(async (request: UpdateProjectRequest) => {
    setProjectsState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const updateProjectUseCase = container.getUpdateProjectUseCase();
      const result = await updateProjectUseCase.execute(request);

      if (result.success && result.project) {
        setProjectsState(prev => ({
          ...prev,
          projects: prev.projects.map(p => 
            p.id.value === request.projectId ? result.project! : p
          ),
          currentProject: prev.currentProject?.id.value === request.projectId ? result.project! : prev.currentProject,
          isLoading: false,
          error: null
        }));
        
        return { success: true, project: result.project };
      } else {
        setProjectsState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Failed to update project' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setProjectsState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to update project' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const deleteProject = useCallback(async (projectId: number) => {
    setProjectsState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const deleteProjectUseCase = container.getDeleteProjectUseCase();
      const result = await deleteProjectUseCase.execute({ projectId });

      if (result.success) {
        setProjectsState(prev => ({
          ...prev,
          projects: prev.projects.filter(p => p.id.value !== projectId),
          currentProject: prev.currentProject?.id.value === projectId ? null : prev.currentProject,
          isLoading: false,
          error: null
        }));
        
        return { success: true, message: result.message };
      } else {
        setProjectsState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Failed to delete project' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setProjectsState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to delete project' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  return {
    ...projectsState,
    createProject,
    getProject,
    updateProject,
    deleteProject,
    loadProjects
  };
}