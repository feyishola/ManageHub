import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { IntegrationProvider } from '../enums/integration-provider.enum';
import { IntegrationStatus } from '../enums/integration-status.enum';

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: IntegrationProvider })
  provider: IntegrationProvider;

  @Column({ type: 'enum', enum: IntegrationStatus, default: IntegrationStatus.CONNECTED })
  status: IntegrationStatus;

  @Column({ type: 'text' })
  accessToken: string; // encrypted

  @Column({ type: 'text' })
  refreshToken: string; // encrypted

  @Column({ type: 'timestamptz' })
  tokenExpiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  scopes: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  connectedAt: Date;
}
