import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApplyTo } from '../enums/apply-to.enum';

@Entity('rate_limits')
@Index(['route', 'method', 'applyTo'], { unique: true })
export class RateLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  route: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'int' })
  maxRequests: number;

  @Column({ type: 'int' })
  windowSeconds: number;

  @Column({
    type: 'enum',
    enum: ApplyTo,
    default: ApplyTo.ALL,
  })
  applyTo: ApplyTo;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
