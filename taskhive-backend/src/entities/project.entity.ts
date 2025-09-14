import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';
import { ChangeLog } from './changelog.entity';

export enum ProjectStatus {
  IN_PROGRESS = 'In Progress',
  TO_REVIEW = 'To Review',
  COMPLETED = 'Completed'
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium', 
  HIGH = 'High'
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: Priority, default: Priority.MEDIUM })
  priority: Priority;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.IN_PROGRESS })
  status: ProjectStatus;

  @Column({ type: 'date', nullable: true })
  due_date?: Date;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'boolean', default: false })
  archived: boolean;

  @Column({ type: 'datetime', nullable: true })
  archived_at?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Foreign Key
  @Column()
  user_id: number;

  // Relationships
  @ManyToOne(() => User, user => user.projects)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @OneToMany(() => ChangeLog, changeLog => changeLog.project)
  changeLogs: ChangeLog[];
}
