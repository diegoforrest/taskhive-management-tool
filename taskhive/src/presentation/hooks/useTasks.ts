import { useState, useCallback } from 'react';
import { container } from '../../shared/di/Container';
import { Task } from '../../core/domain/entities/Task';
import { GetTasksByProjectRequest } from '../../core/application/usecases/tasks/GetTasksByProjectUseCase';
import { CreateTaskUseCaseRequest } from '../../core/application/usecases/task/CreateTaskUseCase';
import { UpdateTaskRequest } from '../../core/application/usecases/task/UpdateTaskUseCase';
import { DeleteTaskRequest } from '../../core/application/usecases/task/DeleteTaskUseCase';

export interface TasksState {
  tasksByProject: Record<number, Task[]>;
  isLoading: boolean;
  error: string | null;
}

export function useTasks() {
  const [tasksState, setTasksState] = useState<TasksState>({
    tasksByProject: {},
    isLoading: false,
    error: null
  });

  const loadTasksForProject = useCallback(async (projectId: number) => {
    setTasksState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const getTasksUseCase = container.getGetTasksByProjectUseCase();
      const result = await getTasksUseCase.execute({ projectId });

      if (result.success && result.tasks) {
        setTasksState(prev => ({
          ...prev,
          tasksByProject: {
            ...prev.tasksByProject,
            [projectId]: result.tasks!
          },
          isLoading: false,
          error: null
        }));
        
        return { success: true, tasks: result.tasks };
      } else {
        setTasksState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Failed to load tasks' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setTasksState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to load tasks' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const loadTasksForMultipleProjects = useCallback(async (projectIds: number[]) => {
    setTasksState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const getTasksUseCase = container.getGetTasksByProjectUseCase();
      
      // Load tasks for all projects in parallel
      const taskPromises = projectIds.map(async (projectId) => {
        try {
          const result = await getTasksUseCase.execute({ projectId });
          return {
            projectId,
            success: result.success,
            tasks: result.tasks || []
          };
        } catch (error) {
          console.error(`Failed to load tasks for project ${projectId}:`, error);
          return {
            projectId,
            success: false,
            tasks: []
          };
        }
      });

      const results = await Promise.all(taskPromises);
      
      const newTasksByProject: Record<number, Task[]> = {};
      results.forEach(({ projectId, tasks }) => {
        newTasksByProject[projectId] = tasks;
      });

      setTasksState(prev => ({
        ...prev,
        tasksByProject: {
          ...prev.tasksByProject,
          ...newTasksByProject
        },
        isLoading: false,
        error: null
      }));
      
      return { success: true, tasksByProject: newTasksByProject };
    } catch (error: any) {
      setTasksState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to load tasks' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const createTask = useCallback(async (request: CreateTaskUseCaseRequest, userId: number) => {
    setTasksState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const createTaskUseCase = container.getCreateTaskUseCase();
      const { UserId } = await import('../../core/domain/valueObjects/UserId');
      const userIdObj = new UserId(userId);
      
      const result = await createTaskUseCase.execute(request, userIdObj);

      // Refresh tasks for the project
      await loadTasksForProject(request.project_id);
      
      return { success: true, task: result.task };
    } catch (error: any) {
      setTasksState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to create task' 
      }));
      return { success: false, message: error.message };
    }
  }, [loadTasksForProject]);

  const updateTask = useCallback(async (request: UpdateTaskRequest) => {
    setTasksState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const updateTaskUseCase = container.getUpdateTaskUseCase();
      const result = await updateTaskUseCase.execute(request);

      if (result.success && result.task) {
        // Update the task in state
        setTasksState(prev => {
          const updatedTasksByProject = { ...prev.tasksByProject };
          const projectId = result.task!.projectId;
          
          if (updatedTasksByProject[projectId]) {
            const taskIndex = updatedTasksByProject[projectId].findIndex(
              t => t.id === result.task!.id
            );
            if (taskIndex >= 0) {
              updatedTasksByProject[projectId][taskIndex] = result.task!;
            }
          }
          
          return {
            ...prev,
            tasksByProject: updatedTasksByProject,
            isLoading: false,
            error: null
          };
        });
        
        return { success: true, task: result.task };
      } else {
        setTasksState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Failed to update task' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setTasksState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to update task' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  const deleteTask = useCallback(async (request: DeleteTaskRequest) => {
    setTasksState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const deleteTaskUseCase = container.getDeleteTaskUseCase();
      const result = await deleteTaskUseCase.execute(request);

      if (result.success) {
        // Remove the task from state
        setTasksState(prev => {
          const updatedTasksByProject = { ...prev.tasksByProject };
          
          // Find and remove the task from all projects
          Object.keys(updatedTasksByProject).forEach(projectIdStr => {
            const projectId = parseInt(projectIdStr);
            updatedTasksByProject[projectId] = updatedTasksByProject[projectId].filter(
              task => task.id !== request.taskId
            );
          });
          
          return {
            ...prev,
            tasksByProject: updatedTasksByProject,
            isLoading: false,
            error: null
          };
        });
        
        return { success: true };
      } else {
        setTasksState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.message || 'Failed to delete task' 
        }));
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setTasksState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to delete task' 
      }));
      return { success: false, message: error.message };
    }
  }, []);

  return {
    ...tasksState,
    loadTasksForProject,
    loadTasksForMultipleProjects,
    createTask,
    updateTask,
    deleteTask
  };
}