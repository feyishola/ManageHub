import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('message_threads')
export class MessageThread {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { array: true })
  participantIds: number[];

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Message, (message) => message.thread)
  messages: Message[];
}
