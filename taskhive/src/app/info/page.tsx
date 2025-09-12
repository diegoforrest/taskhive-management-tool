"use client";

import Link from "next/link";

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full bg-white dark:bg-gray-900 shadow p-6 flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Learn More About TaskHive</h1>
        <p className="text-lg text-muted-foreground text-center max-w-2xl">Explore the features that make TaskHive a powerful productivity tool for individuals and teams.</p>
      </header>

      {/* Features Section */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature Box Example */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">Users</h2>
            <p className="text-muted-foreground text-center">Manage your users, invite team members, and control access easily.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">Signed In</h2>
            <p className="text-muted-foreground text-center">Secure authentication and seamless sign-in experience for all users.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">Task Management</h2>
            <p className="text-muted-foreground text-center">Create, assign, and track tasks with an intuitive kanban board.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">Notifications</h2>
            <p className="text-muted-foreground text-center">Stay updated with real-time notifications for important events.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">Collaboration</h2>
            <p className="text-muted-foreground text-center">Work together with your team and share progress instantly.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2">Analytics</h2>
            <p className="text-muted-foreground text-center">Gain insights into your productivity with built-in analytics.</p>
          </div>
        </div>
        {/* Back link removed per request - single bottom button will be shown */}
      </main>
      {/* Additional bottom section: Demo & Playground */}
      <section className="w-full bg-muted/5 border-t mt-6">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold mb-3">Demo & Playground</h2>
          <p className="text-muted-foreground mb-4">Try a lightweight demo of TaskHive features. This section is informational and can be extended into an interactive playground.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <h3 className="font-medium">Search</h3>
              <p className="text-sm text-muted-foreground">Search across projects and tasks from the main dashboard. Use the search bar in the top bar to quickly find items by title, due date, or priority.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <h3 className="font-medium">Drag & Drop</h3>
              <p className="text-sm text-muted-foreground">Move tasks between columns or projects using drag & drop in the Kanban board. Try dragging a task to a different column to update its status.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <h3 className="font-medium">Priority Indicators</h3>
              <p className="text-sm text-muted-foreground">Priority is shown with icons and colors: High (red / flame), Medium (yellow / zap), Low (green / leaf). Project headers also show a colored dot and badge.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <h3 className="font-medium">Routing</h3>
              <p className="text-sm text-muted-foreground">Project pages are under <code>/dashboard/projects/:id</code>. Review tasks open the Review tab with <code>?projectId=</code>. Completed projects use <code>/dashboard/completed/:id</code>.</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:opacity-90">Open Dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
