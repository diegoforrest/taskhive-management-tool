// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
// import { Task, TaskStatus } from '../../tasks/entities/task.entity';

// @Entity('change_logs')
// export class ChangeLog {
//   @PrimaryGeneratedColumn()
//   change_log_id: number;

//   @Column()
//   task_id: number;

//   @Column({
//     type: 'enum',
//     enum: TaskStatus
//   })
//   old_status: TaskStatus;

//   @Column({
//     type: 'enum',
//     enum: TaskStatus
//   })
//   new_status: TaskStatus;

//   @Column({ type: 'text' })
//   remark: string;

//   @ManyToOne(() => Task, task => task.changeLogs, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'task_id' })
//   task: Task;

//   @CreateDateColumn()
//   createdAt: Date;
// }