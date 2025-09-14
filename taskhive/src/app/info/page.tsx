"use client";

import Link from "next/link";

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full bg-white dark:bg-gray-900 shadow p-6 flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-center">Learn More About TaskHive</h1>
        <p className="text-base sm:text-lg text-muted-foreground text-center max-w-4xl">Stay organized without the clutter of team apps—plan side projects, schoolwork, or personal goals with ease. Drag and drop tasks to keep planning effortless and clear.</p>
      </header>

      {/* Features Section */}
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Feature Box Example */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 md:p-4 lg:p-6 flex flex-col items-center">
            <h2 className="text-sm md:text-lg lg:text-xl font-semibold mb-1 md:mb-2">Overview</h2>
            <p className="text-xs md:text-sm lg:text-base text-muted-foreground text-center">TaskHive is a clean, lightweight project and task manager that helps users work from idea to done without unnecessary complexity. Focus on what matters—priorities, progress, and quick reviews.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 md:p-4 lg:p-6 flex flex-col items-center">
            <h2 className="text-sm md:text-lg lg:text-xl font-semibold mb-1 md:mb-2">How it works?</h2>
            <p className="text-xs md:text-sm lg:text-base text-muted-foreground text-center">Create a project, add tasks with priorities and due dates, and use the review flow when tasks are ready. Reviewers can approve, request changes, or leave notes.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 md:p-4 lg:p-6 flex flex-col items-center">
            <h2 className="text-sm md:text-lg lg:text-xl font-semibold mb-1 md:mb-2">Key Features</h2>
            <p className="text-xs md:text-sm lg:text-base text-muted-foreground text-center">A simple dashboard, color-coded priorities, multi-segment progress bars, changelog-based reviews, and compact mobile-friendly views so you can see progress at a glance.</p>
          </div>
        </div>
      </main>
      <section className="w-full bg-muted/5 border-t mt-6">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold mb-3">Demo & Playground</h2>
          <p className="text-muted-foreground mb-4">Watch the quick demo of TaskHive’s core features, this section highlights overall functionality</p>
            <div className="w-full aspect-video rounded-md overflow-hidden shadow mb-4">
              <iframe
                src="https://www.youtube.com/embed/MBZA6TfHGc4"
                title="TaskHive demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
        </div>
      </section>
    </div>
  );
}
