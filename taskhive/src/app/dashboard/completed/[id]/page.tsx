"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, CheckCircle, Flame, Gauge, Leaf, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { authApi, tasksApi, Project, Task, ChangeLogEntry } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const getInitials = (name?: string | null) => {
	if (!name) return 'U';
	const parts = name.split(/\s+|@|\./).filter(Boolean);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	const first = parts[0];
	return first.substring(0, 2).toUpperCase();
};

export default function CompletedPage() {
	const params = useParams();
	const { user, isAuthenticated } = useAuth();
	const projectIdParam = params?.id;
	const [project, setProject] = useState<Project | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [projectHistory, setProjectHistory] = useState<ChangeLogEntry[]>([]);
	const [selectedTaskHistory, setSelectedTaskHistory] = useState<ChangeLogEntry[]>([]);
	const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const projectId = projectIdParam ? Number(projectIdParam) : NaN;

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			if (!projectId || !isAuthenticated) {
				if (mounted) setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const extractUserId = (u: unknown): number | null => {
					if (!u || typeof u !== 'object') return null;
					const o = u as Record<string, unknown>;
					if (typeof o.user_id === 'number') return o.user_id;
					if (typeof o.userId === 'number') return o.userId;
					if (typeof o.id === 'number') return o.id;
					return null;
				};

				const userId = extractUserId(user) ?? 1;

				// Try to load the single project via helper which filters the user's projects
				try {
					const res = await authApi.getProject(projectId, userId);
					if (mounted && res && res.success) setProject(res.data);
				} catch (e) {
					// fallback: fetch all projects and find
					try {
						const projectsRes = await authApi.getProjects(userId);
						const arr = Array.isArray(projectsRes)
							? projectsRes
							: (projectsRes && typeof projectsRes === 'object' && 'data' in (projectsRes as Record<string, unknown>) ? (projectsRes as Record<string, unknown>).data as unknown : []);
						const candidates = Array.isArray(arr) ? (arr as Project[]) : [];
						const found = candidates.find((p) => p.id === projectId) || null;
						if (mounted) setProject(found);
					} catch (err) {
						console.warn('Failed to load project', err);
					}
				}

				// load tasks for this project
				try {
					const tRes = await authApi.getTasks(projectId);
					const tArr = Array.isArray(tRes)
						? tRes
						: (tRes && typeof tRes === 'object' && 'data' in (tRes as Record<string, unknown>) ? (tRes as Record<string, unknown>).data as unknown : []);
					if (mounted && Array.isArray(tArr)) setTasks(tArr as Task[]);
				} catch (e) {
					console.warn('Failed to load tasks for project', projectId, e);
					if (mounted) setTasks([]);
				}

				// load changelogs for the project
				try {
					const hRes = await tasksApi.getChangelogs(undefined, projectId);
					const hArr = Array.isArray(hRes)
						? hRes
						: (hRes && typeof hRes === 'object' && 'data' in (hRes as Record<string, unknown>) ? (hRes as Record<string, unknown>).data as unknown : []);
					if (mounted && Array.isArray(hArr)) setProjectHistory(hArr as ChangeLogEntry[]);
				} catch (e) {
					console.warn('Failed to load project history', e);
					if (mounted) setProjectHistory([]);
				}

			} finally {
				if (mounted) setLoading(false);
			}
		};

		load();
		return () => { mounted = false; };
	}, [projectId, isAuthenticated, user]);

	const openTaskHistory = async (task: Task) => {
			try {
				const res = await tasksApi.getChangelogs(task.id);
				const arrRaw = Array.isArray(res) ? res : (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>) ? (res as Record<string, unknown>).data as unknown : []);
				const arr = Array.isArray(arrRaw) ? arrRaw : [];
				setSelectedTaskHistory(arr as ChangeLogEntry[]);
			setSelectedTaskTitle(task.name || task.title || 'Task');
		} catch (e) {
			console.warn('Failed to load task history', e);
			setSelectedTaskHistory([]);
			setSelectedTaskTitle(task.name || task.title || 'Task');
		}
	};

		const formatDate = (d?: string) => {
			if (!d) return '—';
			try {
				return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
			} catch {
				return d;
			}
		};

	if (!projectIdParam) {
		return <div className="p-6">No project id provided</div>;
	}

	if (loading) return <div className="p-6">Loading completed hive...</div>;

	return (
		<div className="min-h-screen bg-background">
			{/* Navbar/header */}
			<div className="border-b bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0">
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6">
						<Button variant="ghost" size="sm" asChild className="w-fit">
							<Link href="/dashboard?tab=completed">
								<ArrowLeft className="h-4 w-4 mr-1" />
								<span className="hidden sm:inline">Back to Dashboard</span>
								<span className="sm:hidden">Back</span>
							</Link>
						</Button>

						<h1 className="text-xl sm:text-2xl font-bold">Completed Hive</h1>

						<div className="flex items-center gap-3 text-sm">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<span className="text-muted-foreground">Completed:</span>
								<span className="font-medium">{
									// try to infer completed date from project history
									(() => {
										const completed = projectHistory.slice().filter(h => (h.new_status || '').toLowerCase().includes('completed') || (h.new_status || '').toLowerCase().includes('done'));
										if (completed.length) {
											const latest = completed.sort((a,b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())[0];
											return formatDate(latest.createdAt || latest.createdAt);
										}
										  return project?.createdAt ? formatDate(project.createdAt) : 'Unknown';
									})()
								}</span>
							</div>


              <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                      project?.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      project?.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {project?.priority === 'High' && <Flame className="inline h-3 w-3" aria-hidden />}
                      {project?.priority === 'Medium' && <Gauge className="inline h-3 w-3" aria-hidden />}
                      {project?.priority === 'Low' && <Leaf className="inline h-3 w-3" aria-hidden />}
                      {project?.priority}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </span>
                  </div>
                </div>
                </div>
				</div>
			</div>

			{/* Main content */}
			<div className="space-y-6 p-4 lg:p-6">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">{project?.name || 'Untitled Hive'}</h2>
					<p className="text-muted-foreground">{project?.description || 'No description provided.'}</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						<Card>
							<CardContent>
								<h3 className="text-lg font-semibold mb-2">Tasks History</h3>
								{tasks.length === 0 ? (
									<div className="text-muted-foreground">No tasks found for this hive.</div>
								) : (
									<div className="space-y-3">
										{tasks.map((t) => (
											<div key={t.id} className="border rounded-lg p-3 flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-2 mb-1">
														<h4 className="font-medium">{t.name}</h4>
														<Badge className="bg-green-100 text-green-700">{t.status}</Badge>
													</div>
													{t.contents && <p className="text-sm text-muted-foreground line-clamp-2">{t.contents}</p>}
													<div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
																					{t.assignee && (
																						<div className="flex items-center gap-1">
																							<User className="h-4 w-4">
																							</User>
																							<span>{t.assignee}</span>
																						</div>
																					)}
														{t.due_date && (
															<div className="flex items-center gap-1">
																<Calendar className="h-3 w-3" />
																<span>{formatDate(t.due_date)}</span>
															</div>
														)}
													</div>
												</div>

												<div className="flex flex-col gap-2 ml-4">
													<Button variant="outline" size="sm" onClick={() => openTaskHistory(t)}>
														<MessageSquare className="h-4 w-4 mr-1" aria-hidden />
														Feedback's
													</Button>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Project-level history */}
						<Card>
							<CardContent>
								<h3 className="text-lg font-semibold mb-2">Changelogs History</h3>
								{projectHistory.length === 0 ? (
									<div className="text-muted-foreground">No Changelogs found for this hive.</div>
								) : (
									<div className="space-y-2 max-h-64 overflow-y-auto">
										{projectHistory.slice().sort((a,b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()).map((h) => (
											<div key={h.id} className="border rounded p-2">
												<div className="flex items-center justify-between">
													<div className="text-sm">
														<div className="font-medium">{h.remark || h.description || 'Update'}</div>
														<div className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</div>
													</div>
													<div className="text-xs text-muted-foreground">{h.new_status}</div>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<div className="space-y-4">
						<Card>
							<CardContent>
								<h3 className="text-lg font-semibold mb-2">Hive Details</h3>
								<div className="text-sm text-muted-foreground space-y-2">
									<div>
										<div className="text-xs text-muted-foreground">Owner:</div>
										<div className="flex items-center gap-2 mt-1">
																	<Avatar className="h-8 w-8">
																		<AvatarFallback>{getInitials(project?.name || user?.email || String(project?.user_id || user?.user_id || 'U'))}</AvatarFallback>
																	</Avatar>
											<div>
												<div className="font-medium">{project?.name ? project.name.split(' ')[0] : user?.email?.split('@')[0] || 'Owner'}</div>
												<div className="text-xs text-muted-foreground">{project?.status || 'Completed'}</div>
											</div>
										</div>
									</div>

									<div>
										<div className="text-xs text-muted-foreground">Priority:</div>
										<div className="font-medium">{project?.priority || 'Medium'}</div>
									</div>

									<div>
										<div className="text-xs text-muted-foreground">Completed On:</div>
										<div className="font-medium">{
											(() => {
												const completed = projectHistory.slice().filter(h => (h.new_status || '').toLowerCase().includes('completed') || (h.new_status || '').toLowerCase().includes('done'));
												if (completed.length) {
													const latest = completed.sort((a,b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())[0];
													return formatDate(latest.createdAt);
												}
												return project?.createdAt ? formatDate(project.createdAt) : '—';
											})()
										}</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Task Feedback Dialog */}
				<Dialog open={selectedTaskHistory.length > 0} onOpenChange={(open) => { if (!open) { setSelectedTaskHistory([]); setSelectedTaskTitle(null); } }}>
					<DialogContent className="max-w-2xl max-h-[80vh]">
						<DialogHeader>
							<DialogTitle>Feedback History - {selectedTaskTitle}</DialogTitle>
						</DialogHeader>
						<div className="space-y-3 max-h-96 overflow-y-auto mt-2">
							{selectedTaskHistory.length === 0 ? (
								<div className="text-muted-foreground">No feedback for this task.</div>
							) : (
								selectedTaskHistory.slice().sort((a,b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()).map(h => (
									<div key={h.id} className="border rounded p-2">
										<div className="flex items-center justify-between">
											<div>
												<div className="font-medium">{h.remark || h.description || 'Change'}</div>
												<div className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</div>
											</div>
											<div className="text-xs text-muted-foreground">{h.new_status}</div>
										</div>
									</div>
								))
							)}
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}

