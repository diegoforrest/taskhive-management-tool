"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReviewDashboard from "@/components/review/review-dashboard";
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { user, isAuthenticated } = useAuth();
  const [reviewProjects, setReviewProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load projects for the current user when authenticated
    if (!isAuthenticated) {
      // If not authenticated yet, keep empty and stop loading
      setReviewProjects([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const userId = (user && (user as any).user_id) ? (user as any).user_id : 1; // assume 1 if missing

        // authApi.getProjects returns an object with { success, data } or raw array depending on backend
        const projectsRes = await authApi.getProjects(userId);
        const projects = projectsRes?.data && Array.isArray(projectsRes.data) ? projectsRes.data : (Array.isArray(projectsRes) ? projectsRes : []);

        // Fetch tasks for each project in parallel
        const projectsWithTasks = await Promise.all(
          projects.map(async (p: any) => {
            try {
              const tasksRes = await authApi.getTasks(p.id);
              const tasks = tasksRes?.data && Array.isArray(tasksRes.data) ? tasksRes.data : (Array.isArray(tasksRes) ? tasksRes : []);
              return { ...p, tasks };
            } catch (e) {
              console.error('Failed to load tasks for project', p.id, e);
              return { ...p, tasks: [] };
            }
          })
        );

        if (!cancelled) {
          const filtered = projectId ? projectsWithTasks.filter((p: any) => p.id.toString() === projectId) : projectsWithTasks;
          setReviewProjects(filtered);
        }
      } catch (error) {
        console.error('Failed to load projects for review page:', error);
        if (!cancelled) setReviewProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => { cancelled = true };
  }, [isAuthenticated, user, projectId]);

  if (loading) return <div className="p-6">Loading review projects...</div>;

  return <ReviewDashboard reviewProjects={reviewProjects} />;
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
