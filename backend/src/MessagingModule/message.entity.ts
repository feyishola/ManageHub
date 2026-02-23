import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MessageThread } from './message-thread.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  threadId: number;

  @ManyToOne(() => MessageThread, (thread) => thread.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'threadId' })
  thread: MessageThread;

  @Column()
  senderId: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ default: false })
  deletedBySender: boolean;

  @Column({ default: false })
  deletedByRecipient: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
