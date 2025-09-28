"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { ArrowLeft, Calendar, Target } from "lucide-react";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useProjects } from "@/presentation/hooks/useProjects";
import { toast } from 'react-hot-toast';

export default function NewProjectPage() {
  const { user, isAuthenticated } = useAuth();
  const { createProject, isLoading: isCreatingProject } = useProjects();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    due_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      toast.error('You must be logged in to create a project. Please log in first.');
      router.push('/auth/sign-in');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsLoading(true);

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        userId: user.id.value, // Get the numeric ID from UserId value object
      };

      const result = await createProject(projectData);
      
      if (result.success) {
        // Dispatch custom event to trigger sidebar refresh
        window.dispatchEvent(new CustomEvent('projectCreated', { detail: result.project }));

        toast.success('Project created successfully!');

        // Small delay to ensure the project is saved and sidebar refreshes
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        toast.error(result.message || 'Failed to create project');
      }
      
    } catch (error) {
      console.error("Error creating project:", error);
      // Show more detailed error message
      if (error instanceof Error) {
        toast.error(`Failed to create project: ${error.message}`);
      } else {
        toast.error("Failed to create project. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // toasts handle their own lifecycle; no inline alerts needed

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="h-6 w-px bg-border"></div>
          <div>
            <h1 className="text-2xl font-bold">Create New Project</h1>
            <p className="text-sm text-muted-foreground">Set up your new project with all the necessary details</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 max-w-2xl mx-auto">
        {/* toasts will show success/error messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Project Details
            </CardTitle>
            <CardDescription>
              Fill out the information below to create your new project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Title */}
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>

              {/* Project Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project objectives and scope"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={4}
                />
              </div>

              {/* Priority and Due Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">🔥 High Priority</SelectItem>
                      <SelectItem value="Medium">⚡ Medium Priority</SelectItem>
                      <SelectItem value="Low">🌱 Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex-1">
                  <Label htmlFor="due_date" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange("due_date", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading || isCreatingProject || !formData.name}>
                  {(isLoading || isCreatingProject) ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
