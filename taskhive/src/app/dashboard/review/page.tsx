"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReviewDashboard from "@/components/review/review-dashboard";

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  // Mock project data - in real app this would come from API
  const mockProjects = [
    { 
      id: 2, 
      title: "Soon Due Project", 
      priority: "Medium", 
      due: "2025-09-09",
      tasks: [
        { id: 4, title: "Market Research", status: "Completed", priority: "Medium", due: "2025-09-07" },
        { id: 5, title: "Competitor Analysis", status: "Completed", priority: "Low", due: "2025-09-08" },
        { id: 6, title: "Strategy Planning", status: "Completed", priority: "High", due: "2025-09-09" }
      ]
    },
    { 
      id: 6, 
      title: "Urgent Project", 
      priority: "High", 
      due: "2025-09-08",
      tasks: [
        { id: 13, title: "Bug Fix", status: "Completed", priority: "High", due: "2025-09-08" }
      ]
    },
  ];

  // Filter projects based on projectId if provided
  const reviewProjects = projectId 
    ? mockProjects.filter(p => p.id.toString() === projectId)
    : mockProjects;

  return <ReviewDashboard reviewProjects={reviewProjects} />;
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
