"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ReviewDashboard from "@/components/review/review-dashboard";
import { useAuth } from '@/lib/auth-context';
import { authApi, Project, Task } from '@/lib/api';

function hasData<T>(v: unknown): v is { data: T } {
  return typeof v === 'object' && v !== null && 'data' in v;
}

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { user, isAuthenticated } = useAuth();
  const [reviewProjects, setReviewProjects] = useState<(Project & { tasks?: Task[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);

  // Stable fetch function so we can call it from interval/focus handlers
  const fetchProjects = useCallback(async () => {
    // Load projects for the current user when authenticated
    if (!isAuthenticated) {
      // If not authenticated yet, keep empty and stop loading
      if (isMountedRef.current) setReviewProjects([]);
      if (isMountedRef.current) setLoading(false);
      return;
    }

    try {
      if (isMountedRef.current) setLoading(true);

      const extractUserId = (u: unknown): number | null => {
        if (!u || typeof u !== 'object') return null;
        const obj = u as Record<string, unknown>;
        if (typeof obj.user_id === 'number') return obj.user_id;
        if (typeof obj.userId === 'number') return obj.userId;
        if (typeof obj.id === 'number') return obj.id;
        return null;
      };

      const userId = extractUserId(user) ?? 1;

      // authApi.getProjects returns an object with { success, data } or raw array depending on backend
      const projectsRes = await authApi.getProjects(userId);
      const projects = hasData<Project[]>(projectsRes) ? projectsRes.data : (Array.isArray(projectsRes) ? projectsRes : []);

      // Fetch tasks for each project in parallel
      const projectsWithTasks = await Promise.all(
        projects.map(async (p: Project) => {
          try {
            const tasksRes = await authApi.getTasks(p.id);
            const tasks = hasData<Task[]>(tasksRes) ? tasksRes.data : (Array.isArray(tasksRes) ? tasksRes : []);
            return { ...p, tasks } as Project & { tasks: Task[] };
          } catch (e) {
            console.error('Failed to load tasks for project', p.id, e);
            return { ...p, tasks: [] } as Project & { tasks: Task[] };
          }
        })
      );

      if (isMountedRef.current) {
        const filtered = projectId ? projectsWithTasks.filter((p) => p.id.toString() === projectId) : projectsWithTasks;
        setReviewProjects(filtered);
      }
    } catch (error) {
      console.error('Failed to load projects for review page:', error);
      if (isMountedRef.current) setReviewProjects([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [isAuthenticated, user, projectId]);

  // Initial load and cancel-on-unmount
  useEffect(() => {
    isMountedRef.current = true;
    fetchProjects();
    return () => { isMountedRef.current = false; };
  }, [fetchProjects]);

  // If auth wasn't ready on first mount, ensure we fetch as soon as it becomes available
  useEffect(() => {
    if (isAuthenticated) {
      // call fetchProjects when authentication becomes true
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  

  if (loading && reviewProjects.length === 0) return <div className="p-6">Loading review projects...</div>;

  return (
    <div>
      {loading && reviewProjects.length > 0 && (
        <div className="p-2 text-sm text-muted-foreground">Refreshing reviews... ⟳</div>
      )}
      <ReviewDashboard reviewProjects={reviewProjects} />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
