import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create(createTaskDto);
    return await this.taskRepository.save(task);
  }

  async findAll(userId?: number): Promise<Task[]> {
    const query = this.taskRepository.createQueryBuilder('task');
    
    if (userId) {
      query.where('task.user_id = :userId', { userId });
    }
    
    return await query
      .orderBy('task.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    Object.assign(task, updateTaskDto);
    return await this.taskRepository.save(task);
  }

  async updateStatus(id: number, status: string): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status as any;
    
    // Auto-update progress based on status
    if (status === 'Completed') {
      task.progress = 100;
    } else if (status === 'In Progress' && task.progress === 0) {
      task.progress = 25;
    } else if (status === 'Todo') {
      task.progress = 0;
    }
    
    return await this.taskRepository.save(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.taskRepository.remove(task);
  }

  async getTasksByStatus(userId?: number): Promise<{ [key: string]: Task[] }> {
    const tasks = await this.findAll(userId);
    
    return {
      'Todo': tasks.filter(task => task.status === 'Todo'),
      'In Progress': tasks.filter(task => task.status === 'In Progress'),
      'Completed': tasks.filter(task => task.status === 'Completed'),
    };
  }
}
