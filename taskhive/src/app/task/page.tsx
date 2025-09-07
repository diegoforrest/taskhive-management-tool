"use client"

import EnhancedKanbanBoard from "@/components/task/enhanced-kanban-board";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function KanbanPage() {
  return (
    <ProtectedRoute>
      <EnhancedKanbanBoard />
    </ProtectedRoute>
  );
}