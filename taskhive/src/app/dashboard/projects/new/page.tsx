"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Users, Target } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";

export default function NewProjectPage() {
  const { user } = useAuth();
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
    
    if (!user?.user_id) {
      console.error('No user or user_id found in auth context:', user);
      alert('You must be logged in to create a project. Please log in first.');
      router.push('/auth/sign-in');
      return;
    }

    if (!formData.name.trim()) {
      alert('Project name is required');
      return;
    }

    console.log("=== PRE-SUBMISSION DEBUG ===");
    console.log("User from auth context:", user);
    console.log("User ID from context:", user.user_id);
    console.log("User ID type:", typeof user.user_id);
    
    // More robust user_id parsing
    let numericUserId: number;
    
    // First try to parse as number
    if (typeof user.user_id === 'string') {
      numericUserId = parseInt(user.user_id, 10);
    } else if (typeof user.user_id === 'number') {
      numericUserId = user.user_id;
    } else {
      console.error('Invalid user_id type:', typeof user.user_id, user.user_id);
      alert('Invalid user ID format. Please log out and log back in.');
      return;
    }
    
    // Validate the parsed number
    if (isNaN(numericUserId) || numericUserId <= 0) {
      console.error('Cannot convert user_id to valid number:', user.user_id, '-> NaN or invalid');
      alert(`Invalid user ID: "${user.user_id}". Please log out and log back in.`);
      return;
    }

    setIsLoading(true);

    try {
      const projectData = {
        user_id: numericUserId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
      };

      console.log("=== PROJECT CREATION DEBUG ===");
      console.log("Parsed user_id:", numericUserId);
      console.log("Is valid number?", !isNaN(numericUserId) && numericUserId > 0);
      console.log("Creating project with data:", projectData);
      console.log("Final user_id being sent:", projectData.user_id);
      console.log("user_id type:", typeof projectData.user_id);
      
      const result = await authApi.createProject(projectData);
      
      console.log("=== API RESPONSE ===");
      console.log("Full API response:", result);
      
      // Dispatch custom event to trigger sidebar refresh
      window.dispatchEvent(new CustomEvent('projectCreated', { detail: result }));
      
      alert(`Project created successfully!`);
      
      // Small delay to ensure the project is saved and sidebar refreshes
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
      
    } catch (error) {
      console.error("Error creating project:", error);
      // Show more detailed error message
      if (error instanceof Error) {
        alert(`Failed to create project: ${error.message}`);
      } else {
        alert("Failed to create project. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
                <Button type="submit" disabled={isLoading || !formData.name}>
                  {isLoading ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
