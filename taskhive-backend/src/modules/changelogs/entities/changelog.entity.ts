import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';

@Entity('change_logs')
export class ChangeLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  old_status?: string;

  @Column({ nullable: true })
  new_status?: string;

  @Column('text', { nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Foreign Keys
  @Column()
  user_id: number;

  @Column({ nullable: true })
  project_id?: number;

  @Column({ nullable: true })
  task_id?: number;

  // Relationships
  @ManyToOne(() => User, user => user.changeLogs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Project, project => project.changeLogs, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @ManyToOne(() => Task, task => task.changeLogs, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: Task;
}
