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
        <div className="flex justify-center mt-10">
          <Link href="/" className="text-primary hover:underline">&larr; Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
