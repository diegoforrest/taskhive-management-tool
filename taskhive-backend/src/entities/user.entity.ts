import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { ChangeLog } from './changelog.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  username?: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Project, project => project.user)
  projects: Project[];

  @OneToMany(() => Task, task => task.assignedUser)
  tasks: Task[];

  @OneToMany(() => ChangeLog, changeLog => changeLog.user)
  changeLogs: ChangeLog[];
}
