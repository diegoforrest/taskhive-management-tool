"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { ArrowLeft, Settings, Trash2, Archive } from "lucide-react";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/presentation/components/ui/dialog";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useProjects } from "@/presentation/hooks/useProjects";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { getProject, updateProject, deleteProject, currentProject, isLoading: projectsLoading } = useProjects();
  const projectId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Initialize form data from current project
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    due_date: "",
    status: "In Progress" as string,
  });

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || !isAuthenticated) return;

      const result = await getProject(parseInt(projectId));
      if (result.success && result.project) {
        const project = result.project;
        setFormData({
          name: project.name || '',
          description: project.description || '',
          priority: (project.priority === 'High' || project.priority === 'Low') ? project.priority : 'Medium',
          due_date: project.dueDate ? project.dueDate.toISOString().split('T')[0] : '',
          status: project.status || 'In Progress',
        });
      }
    };

    loadProject();
  }, [projectId, isAuthenticated, getProject]);

  // Update form when currentProject changes
  useEffect(() => {
    if (currentProject) {
      setFormData({
        name: currentProject.name || '',
        description: currentProject.description || '',
        priority: (currentProject.priority === 'High' || currentProject.priority === 'Low') ? currentProject.priority : 'Medium',
        due_date: currentProject.dueDate ? currentProject.dueDate.toISOString().split('T')[0] : '',
        status: currentProject.status || 'In Progress',
      });
    }
  }, [currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !projectId) return;

    setIsLoading(true);

    try {
      const updateData = {
        projectId: parseInt(projectId),
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date,
        status: formData.status,
      };

      const result = await updateProject(updateData);

      if (result.success) {
        // Trigger sidebar refresh
        window.dispatchEvent(new Event('projectUpdated'));

        // Redirect to project page after successful update
        router.push(`/dashboard/projects/${projectId}`);
      } else {
        throw new Error(result.message || 'Failed to update project');
      }
    } catch (error) {
      console.error("Error updating project:", error);
      // Could add error state here if needed
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated || !projectId) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteProject(parseInt(projectId));

      if (result.success) {
        console.log("Project deleted successfully");
        // Trigger sidebar refresh
        window.dispatchEvent(new Event('projectUpdated'));
        // Redirect to dashboard after deletion
        router.push("/dashboard");
      } else {
        throw new Error(result.message || 'Failed to delete project');
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Project
          </Button>
          <div className="h-6 w-px bg-border"></div>
          <div>
            <h1 className="text-2xl font-bold">Edit Project</h1>
            <p className="text-sm text-muted-foreground">Modify project details and settings</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Main Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Project Settings
              </CardTitle>
              <CardDescription>
                Update your project information and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Project Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter project title"
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
                    rows={6}
                    className="min-h-[150px] max-h-[300px] resize-y"
                  />
                </div>

                {/* Priority, Due Date, and Status Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High Priority</SelectItem>
                        <SelectItem value="Medium">Medium Priority</SelectItem>
                        <SelectItem value="Low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate" className="flex items-center gap-1">
                      Due Date
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      className="w-full"
                      value={formData.due_date}
                      onChange={(e) => handleInputChange("due_date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Project Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select project status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="To Review">To Review</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isLoading || !formData.name}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Actions that cannot be undone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Deleting this project will permanently remove all associated tasks, files, and data. 
                  This action cannot be undone.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end mt-4">
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone and will permanently remove all associated tasks, files, and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
