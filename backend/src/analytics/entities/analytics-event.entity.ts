import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_events')
@Index(['event', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  event: string;

  @Column({ type: 'jsonb', default: {} })
  properties: Record<string, any>;

  @Column()
  sessionId: string;

  @Column()
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
