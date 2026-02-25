import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('billing_profiles')
@Unique(['userId'])
export class BillingProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  companyName?: string;

  @Column({ type: 'text', nullable: true })
  taxId?: string; // encrypted

  @Column()
  billingEmail: string;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  postalCode: string;

  @Column({ length: 2 })
  country: string; // ISO 3166-1 alpha-2

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
