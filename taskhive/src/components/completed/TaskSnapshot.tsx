"use client";

import React from "react";
import type { Task } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TaskSnapshot({ tasks = [] }: { tasks?: Task[] }) {
  if (!tasks || tasks.length === 0) return <div className="p-4 bg-white rounded shadow text-sm text-muted-foreground">No tasks recorded</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className={`font-medium ${t.status === 'Done' ? 'text-muted-foreground line-through' : ''}`}>{t.name}</div>
                {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
              </div>
              <div className="text-xs text-right flex items-center gap-2">
                <Badge variant="secondary">{t.priority ?? 'Medium'}</Badge>
                <div className="text-muted-foreground">{t.assignee ? `@${t.assignee}` : ''}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
