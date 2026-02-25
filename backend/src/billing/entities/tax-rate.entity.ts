import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ length: 2 })
  country: string;

  @Column({ nullable: true })
  region?: string;

  @Column('decimal', { precision: 5, scale: 2 })
  rate: number; // percentage

  @Column({ default: false })
  isCompound: boolean;

  @Column({ default: true })
  isActive: boolean;
}
