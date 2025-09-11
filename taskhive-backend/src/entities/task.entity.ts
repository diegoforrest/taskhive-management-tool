import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { ChangeLog } from './changelog.entity';

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Done',
  ON_HOLD = 'On Hold',
  REQUEST_CHANGES = 'Request Changes'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum TaskType {
  TASK = 'task',
  PROJECT = 'project'
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  contents?: string;

  @Column({ type: 'enum', enum: TaskType, default: TaskType.TASK })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'date', nullable: true })
  due_date?: Date;

  @Column({ nullable: true })
  assignee?: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Foreign Keys
  @Column()
  project_id: number;

  @Column({ nullable: true })
  assigned_user_id?: number;

  // Relationships
  @ManyToOne(() => Project, project => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, user => user.tasks, { nullable: true })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser?: User;

  @OneToMany(() => ChangeLog, changeLog => changeLog.task)
  changeLogs: ChangeLog[];
}
