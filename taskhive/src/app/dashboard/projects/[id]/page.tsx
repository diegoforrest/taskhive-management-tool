"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Settings, CheckCircle, AlertCircle, PlayCircle, Clock } from "lucide-react";
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
        let data: any = null;
        if (res && typeof res === 'object' && 'data' in res) data = (res as any).data;
        else if (res && typeof res === 'object' && (res as any).success && (res as any).data) data = (res as any).data;
        else data = res;
        if (mounted) setProject(data || null);
      } catch (e) {
        console.warn('Failed to fetch project', e);
        if (mounted) setProject(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Project Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
        {/* Single line header with all elements - responsive */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6">
            <Button variant="ghost" size="sm" asChild className="w-fit">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">Task Board</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span className="font-medium">{project ? formatProjectDue(project.due_date) : (loading ? 'Loading...' : 'No due date')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  project?.priority === 'High' ? 'bg-red-100 text-red-700' : 
                  project?.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project?.priority === 'High' && '🔥 '}
                  {project?.priority === 'Medium' && '⚡ '}
                  {project?.priority === 'Low' && '🌱 '}
                  <span className="hidden sm:inline">Priority: </span>
                  {project?.priority ?? 'Unknown'}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                  project?.status === 'Completed' ? 'bg-green-100 text-green-700' :
                  project?.status === 'Ready for Review' ? 'bg-yellow-100 text-yellow-700' :
                  project?.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project?.status === 'Completed' ? <CheckCircle className="h-3 w-3" /> :
                   project?.status === 'Ready for Review' ? <AlertCircle className="h-3 w-3" /> :
                   project?.status === 'In Progress' ? <PlayCircle className="h-3 w-3" /> :
                   <Clock className="h-3 w-3" />}
                  <span className="hidden sm:inline">Status: </span>
                  {project?.status ?? 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <Button asChild className="w-fit lg:w-auto">
            <Link href={`/dashboard/projects/${projectId}/edit`}>
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Edit Project</span>
              <span className="sm:hidden">Edit</span>
            </Link>
          </Button>
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
