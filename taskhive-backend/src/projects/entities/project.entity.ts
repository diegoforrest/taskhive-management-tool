// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
// import { User } from '../../users/entities/user.entity';
// import { Task } from '../../tasks/entities/task.entity';

// @Entity('projects')
// export class Project {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   name: string;

//   @Column({ type: 'text' })
//   description: string;

//   @Column()
//   user_id: string;

//   @ManyToOne(() => User, user => user.projects, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
//   user: User;

//   @OneToMany(() => Task, task => task.project)
//   tasks: Task[];

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }