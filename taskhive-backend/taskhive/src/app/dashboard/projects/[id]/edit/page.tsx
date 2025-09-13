"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Settings, Trash2, Archive } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    due_date: "",
    status: "In Progress" as string,
  });

  // Mock data loading - replace with actual API call
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || !user) return;

      setIsLoading(true);
      try {
        const response = await authApi.getProject(parseInt(projectId), user.user_id);
        if (response.success && response.data) {
          const project = response.data;
          const normalizedPriority = project.priority === 'High' ? 'High' : project.priority === 'Low' ? 'Low' : 'Medium';
          setFormData({
            name: project.name || '',
            description: project.description || '',
            priority: normalizedPriority,
            due_date: project.due_date ? project.due_date.split('T')[0] : '', // Format date for input
            status: project.status || 'In Progress',
          });
        }
      } catch (error) {
        console.error('Error loading project:', error);
        // Keep mock data as fallback
        const mockProject = {
          name: `Project ${projectId}`,
          description: "This is a detailed description of the project and its objectives.",
          priority: "High" as const,
          due_date: "2025-09-10",
          status: "In Progress",
        };
        setFormData(mockProject);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId) return;

    setIsLoading(true);

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date,
        status: formData.status,
      };

  const rawResponse = await authApi.updateProject(parseInt(projectId), updateData);
  const response = (rawResponse && typeof rawResponse === 'object' && 'success' in (rawResponse as Record<string, unknown>)) ? (rawResponse as unknown as Record<string, unknown>) : { success: true, data: rawResponse };

      if (response.success) {
        // Trigger sidebar refresh
        window.dispatchEvent(new Event('projectUpdated'));

        // Redirect to project page after successful update
        router.push(`/dashboard/projects/${projectId}`);
      } else {
        const msg = (response && typeof response === 'object' && 'message' in (response as Record<string, unknown>)) ? String((response as Record<string, unknown>)['message']) : 'Failed to update project';
        throw new Error(msg);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      // Could add error state here if needed
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !projectId) return;
    
    setIsDeleting(true);
    try {
      console.log("Deleting project:", projectId);
      
  const rawResponse = await authApi.deleteProject(parseInt(projectId));
  const response = (rawResponse && typeof rawResponse === 'object' && 'success' in (rawResponse as Record<string, unknown>)) ? (rawResponse as unknown as Record<string, unknown>) : { success: true, data: rawResponse };

      if (response.success) {
        console.log("Project deleted successfully");
        // Trigger sidebar refresh
        window.dispatchEvent(new Event('projectUpdated'));
        // Redirect to dashboard after deletion
        router.push("/dashboard");
      } else {
        const msg = (response && typeof response === 'object' && 'message' in (response as Record<string, unknown>)) ? String((response as Record<string, unknown>)['message']) : 'Failed to delete project';
        throw new Error(msg);
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
