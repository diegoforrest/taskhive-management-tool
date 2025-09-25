import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'text' })
  token_hash: string;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date | null;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
