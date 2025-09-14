"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Settings, CheckCircle, AlertCircle, PlayCircle, Clock, Flame, Gauge, Leaf, Rocket } from "lucide-react";
import EnhancedKanbanBoard from "@/components/task/enhanced-kanban-board";
import { authApi, Project } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  const formatProjectDue = (due?: string | undefined) => {
    if (!due) return 'No due date';
    try {
      return new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return due;
    }
  };

  useEffect(() => {
    let mounted = true;
  (async () => {
      setLoading(true);
      try {
        // Pass user id to API; fallback to 1 if unknown
    const userId = Number(user?.user_id ?? 1);
    const res = await authApi.getProject(Number(projectId), userId);
    let data: unknown = null;
    if (res && typeof res === 'object' && 'data' in res) data = (res as Record<string, unknown>).data;
    else if (res && typeof res === 'object' && (res as Record<string, unknown>).hasOwnProperty('success') && (res as Record<string, unknown>).hasOwnProperty('data')) data = (res as Record<string, unknown>).data;
    else data = res;
  if (mounted) setProject((data as Project) || null);
      } catch (e) {
        console.warn('Failed to fetch project', e);
        if (mounted) setProject(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
  return () => { mounted = false; };
  }, [projectId, user?.user_id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Project Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
        {/* Mobile (xs) compact header: show on xs, hide on sm+ */}
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold truncate">Task Hive</h1>

            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs truncate">{project ? formatProjectDue(project.due_date) : (loading ? 'Loading...' : 'No due date')}</span>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {/* Priority - small colored pill (icon + color) to preserve badge on mobile */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                project?.priority === 'High' ? 'bg-red-100 text-red-700' : 
                project?.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                'bg-gray-100 text-gray-700'
              }`} aria-hidden>
                {project?.priority === 'High' && <Flame className="h-3 w-3" />}
                {project?.priority === 'Medium' && <Gauge className="h-3 w-3" />}
                {project?.priority === 'Low' && <Leaf className="h-3 w-3" />}
                <span className="sr-only">Priority: {project?.priority ?? 'Unknown'}</span>
              </span>

              {/* Status - small colored pill */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                project?.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                project?.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                'bg-gray-100 text-gray-700'
              }`} aria-hidden>
                {project?.status === 'Completed' ? <CheckCircle className="h-3 w-3" /> : project?.status === 'In Progress' ? <Rocket className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                <span className="sr-only">Status: {project?.status ?? 'Unknown'}</span>
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button asChild className="w-fit lg:w-auto p-0.5 sm:p-2">
              <Link href={`/dashboard/projects/${projectId}/edit`} className="flex items-center gap-0.5 text-xs sm:text-sm">
                <Settings className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-0">
          <div className="flex flex-row items-center gap-3 sm:gap-4 lg:gap-6">
            <h1 className="text-xl sm:text-2xl font-bold">Task Hive</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span className="font-medium">{project ? formatProjectDue(project.due_date) : (loading ? 'Loading...' : 'No due date')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-label={`Priority: ${project?.priority ?? 'Unknown'}`}
                  className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                    project?.priority === 'High' ? 'bg-red-100 text-red-700' : 
                    project?.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {project?.priority === 'High' && <Flame className="inline h-3 w-3" aria-hidden />}
                  {project?.priority === 'Medium' && <Gauge className="inline h-3 w-3" aria-hidden />}
                  {project?.priority === 'Low' && <Leaf className="inline h-3 w-3" aria-hidden />}
                  {/* visible label only on large desktop (>=1499px) */}
                  <span className="hidden min-[1499px]:inline ml-1">{project?.priority ?? ''}</span>
                </span>

                <span
                  aria-label={`Status: ${project?.status ?? 'Unknown'}`}
                  className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                    project?.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    project?.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {project?.status === 'Completed' ? <CheckCircle className="h-3 w-3" /> :
                   project?.status === 'In Progress' ? <Rocket className="h-3 w-3" /> :
                   <Clock className="h-3 w-3" />}
                  {/* visible label only on large desktop (>=1499px) */}
                  <span className="hidden min-[1499px]:inline ml-1">{project?.status ?? ''}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
          <Button asChild className="w-fit lg:w-auto">
            <Link href={`/dashboard/projects/${projectId}/edit`}>
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden lg:inline">Edit Project</span>
              <span className="sm:hidden">Edit</span>
            </Link>
          </Button>
          </div>
        </div>
      </div>

      {/* Tasks Kanban Board */}
        <div className="p-6">
        <EnhancedKanbanBoard 
          project={{
            title: project?.name ?? `Project ${projectId}`,
            description: project?.description ?? ''
          }}
          projectId={parseInt(projectId)}
        />
      </div>
    </div>
  );
}
