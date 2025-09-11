"use client";

import { Button } from "@/components/ui/button";
import Link from 'next/link';
import ClientDate from "@/components/ui/client-date";
import type { Project } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CompletedHeader({ project, loading, onReopen }: { project: Project | null; loading: boolean; onReopen: () => void }) {
  if (loading) return <div className="p-4 bg-white rounded shadow">Loading...</div>;
  if (!project) return <div className="p-4 bg-white rounded shadow">Project not found</div>;

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle className="text-2xl">{project?.name}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{project?.description}</p>
          <div className="flex gap-2 mt-3 text-xs">
            {
              (() => {
                const p = project ? (project as unknown as Record<string, unknown>) : null;
                const priority = p && typeof p.priority === 'string' ? (p.priority as string) : 'Medium';
                return <Badge variant="secondary">{priority}</Badge>;
              })()
            }
            {
              (() => {
                const p = project ? (project as unknown as Record<string, unknown>) : null;
                const completedIso = p && (typeof p.completedAt === 'string' ? p.completedAt : typeof p.completed_at === 'string' ? p.completed_at : typeof p.completed === 'string' ? p.completed : null);
                return <Badge className="bg-green-100 text-green-800">Completed <ClientDate iso={completedIso as string | null} options={{ year: 'numeric', month: 'short', day: 'numeric' }} /></Badge>;
              })()
            }
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-sm text-muted-foreground">Status: <span className="font-semibold">{project?.status}</span></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReopen}>Reopen</Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/projects/${project.id}/edit`} aria-label="Edit Project">Edit</Link>
            </Button>
            <Button size="sm">Export</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
