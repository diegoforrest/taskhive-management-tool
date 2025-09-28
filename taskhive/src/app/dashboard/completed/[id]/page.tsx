"use client";

import React, { useEffect, useState } from 'react';
// Link not used in this view
import { useParams } from 'next/navigation';
import { Calendar, Gauge, Flame, Leaf, CircleCheckBig, CalendarCheck, User } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent } from '@/presentation/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { tasksApi, ChangeLogEntry } from '@/lib/api';
import { Project } from '@/core/domain/entities/Project';
import { Task } from '@/core/domain/entities/Task';
import { useAuth } from '@/presentation/hooks/useAuth';
import { useProjects } from '@/presentation/hooks/useProjects';
import { useTasks } from '@/presentation/hooks/useTasks';
import { Avatar, AvatarFallback } from '@/presentation/components/ui/avatar';

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
	const { getProject, loadProjects } = useProjects();
	const { loadTasksForProject } = useTasks();
	const projectIdParam = params?.id;
	const [project, setProject] = useState<Project | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [projectHistory, setProjectHistory] = useState<ChangeLogEntry[]>([]);
	const [selectedTaskHistory, setSelectedTaskHistory] = useState<ChangeLogEntry[]>([]);
	const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const projectId = projectIdParam ? Number(projectIdParam) : NaN;

	// Derive owner display name from project or user object
	const getOwnerFullName = () => {
		// Prefer explicit owner fields on project
		if (project) {
			const p = project as any;
			if (p.ownerName && typeof p.ownerName === 'string' && p.ownerName.trim()) return p.ownerName;
			if (p.owner && typeof p.owner === 'string' && p.owner.trim()) return p.owner;
			if (p.user_first_name || p.userFirstName) {
				const fn = p.user_first_name || p.userFirstName;
				const ln = p.user_last_name || p.userLastName || '';
				return `${fn}${ln ? ' ' + ln : ''}`.trim();
			}
		}

		// Fall back to current authenticated user
		const u = user as any;
		if (!u) return '';
		// Try common name fields
		const first = u.firstName ?? u.first_name ?? u.given_name ?? (typeof u.name === 'string' ? u.name.split(' ')[0] : undefined);
		const last = u.lastName ?? u.last_name ?? u.family_name ?? (typeof u.name === 'string' ? u.name.split(' ').slice(1).join(' ') : undefined);
		if (first && last) return `${first} ${last}`.trim();
		if (u.name && typeof u.name === 'string') return u.name;
		if (u.email && typeof u.email === 'string') return u.email.split('@')[0];
		return '';
	};

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

				// Try to load the single project via Clean Architecture
				try {
					const res = await getProject(projectId);
					if (mounted && res && res.success && res.project) setProject(res.project);
				} catch {
					// fallback: fetch all projects and find
					try {
						const projectsRes = await loadProjects(userId);
						if (mounted && projectsRes.success && projectsRes.projects) {
							const found = projectsRes.projects.find((p) => p.id.value === projectId) || null;
							setProject(found);
						}
					} catch (err) {
						console.warn('Failed to load project', err);
					}
				}

				// load tasks for this project
				try {
					const tRes = await loadTasksForProject(projectId);
					if (mounted && tRes.success && tRes.tasks) {
						const completedTasks = tRes.tasks.filter((t) => t.status === 'Completed' || t.status === 'Done');
						setTasks(completedTasks);
					}
				} catch {
					// Failed to load tasks for project; fall back to empty list
					if (mounted) setTasks([]);
				}

				// load changelogs for the project
				try {
					const hRes = await tasksApi.getChangelogs(undefined, projectId);
					const hArr = Array.isArray(hRes)
						? hRes
						: (hRes && typeof hRes === 'object' && 'data' in (hRes as Record<string, unknown>) ? (hRes as Record<string, unknown>).data as unknown : []);
					if (mounted && Array.isArray(hArr)) setProjectHistory(hArr as ChangeLogEntry[]);
				} catch {
					// Failed to load project history
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
			setSelectedTaskTitle(task.name || 'Task');
		} catch {
			// Failed to load task history
			setSelectedTaskHistory([]);
			setSelectedTaskTitle(task.name || 'Task');
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

		// derive a single completed date string used in header
		const completedDate = (() => {
			const completed = projectHistory.slice().filter(h => (h.new_status || '').toLowerCase().includes('completed') || (h.new_status || '').toLowerCase().includes('done'));
			if (completed.length) {
				const latest = completed.sort((a,b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())[0];
				return formatDate(latest.createdAt || latest.createdAt);
			}
			return project?.createdAt ? formatDate(project.createdAt) : 'Unknown';
		})();

	if (!projectIdParam) {
		return <div className="p-6">No project id provided</div>;
	}

	if (loading) return <div className="p-6">Loading completed hive...</div>;

	return (
		<div className="min-h-screen bg-background">
			{/* Navbar/header - inline on small screens */}
			<div className="border-b bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
				<div className="flex items-center gap-3 flex-wrap lg:flex-nowrap lg:justify-between">
					<div className="flex items-center gap-3">

						<h1 className="text-sm sm:text-base lg:text-2xl font-bold whitespace-nowrap">Completed Hive</h1>

						<div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
							<CalendarCheck className="h-3 w-3" />
							<span className="text-xs font-medium">{completedDate}</span>
						</div>

						<div className="flex items-center gap-2 text-sm">
							<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
								project?.priority === 'High' ? 'bg-red-100 text-red-700' : 
								project?.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
								'bg-gray-100 text-gray-700'
							}`}>
								{project?.priority === 'High' && <Flame className="h-3 w-3" aria-hidden />}
								{project?.priority === 'Medium' && <Gauge className="h-3 w-3" aria-hidden />}
								{project?.priority === 'Low' && <Leaf className="h-3 w-3" aria-hidden />}
								<span className="hidden lg:inline">{project?.priority}</span>
							</span>
							<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 bg-green-100 text-green-700">
								<CircleCheckBig className="h-3 w-3" />
								<span className="hidden lg:inline">Completed</span>
							</span>
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
								<h3 className="text-lg font-semibold mb-2">Tasks</h3>
								{tasks.length === 0 ? (
									<div className="text-muted-foreground">No tasks found for this hive.</div>
								) : (
									<div className="space-y-3">
										{tasks.map((t) => (
											<div key={t.id} className="border rounded-lg p-3 flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-2 mb-1">
														<h4 className="font-medium">{t.name}</h4>
														<Badge className="bg-green-100 text-green-800">{t.status}</Badge>
													</div>
													{t.contents && <p className="text-sm text-muted-foreground line-clamp-2">{t.contents}</p>}
													<div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
														{t.assignee && (
															<div className="flex items-center gap-2">
																<div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium flex-shrink-0">
																	<User className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden />
																</div>
																<span className="text-sm">{t.assignee}</span>
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
													<Button variant="outline" size="sm" asChild className="w-fit p-0.5 sm:p-2 flex-shrink-0">
														<button onClick={() => openTaskHistory(t)} className="flex items-center gap-0.5 text-xs sm:text-sm">
															<svg className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
																<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
															</svg>
															<span className="hidden sm:inline">Feedback's</span>
															<span className="sr-only sm:hidden">Feedbacks</span>
														</button>
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
								<h3 className="text-lg font-semibold mb-2">Changelog History</h3>
								{projectHistory.length === 0 ? (
									<div className="text-muted-foreground">No Changelog found for this hive.</div>
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
												<AvatarFallback>{getInitials(getOwnerFullName() || project?.name || user?.email || String(project?.user_id || user?.id || 'U'))}</AvatarFallback>
											</Avatar>
											<div>
												<div className="font-medium">{getOwnerFullName() || (project?.name ? project.name.split(' ')[0] : user?.email?.split('@')[0] || 'Owner')}</div>
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
							<DialogTitle>Feedback - {selectedTaskTitle}</DialogTitle>
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

