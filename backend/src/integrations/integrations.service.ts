import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Integration } from './entities/integration.entity';
import { IntegrationProvider } from './enums/integration-provider.enum';
import { IntegrationStatus } from './enums/integration-status.enum';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly repo: Repository<Integration>,
  ) {}

  private encryptToken(token: string): string {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.TOKEN_SECRET!, 'hex'),
      Buffer.from(process.env.TOKEN_IV!, 'hex'),
    );
    return Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]).toString('hex');
  }

  private decryptToken(encrypted: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.TOKEN_SECRET!, 'hex'),
      Buffer.from(process.env.TOKEN_IV!, 'hex'),
    );
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]).toString('utf8');
  }

  async listUserIntegrations(userId: string) {
    return this.repo.find({ where: { userId } });
  }

  async connectIntegration(userId: string, provider: IntegrationProvider, accessToken: string, refreshToken: string, expiresAt: Date, scopes: any) {
    const integration = this.repo.create({
      userId,
      provider,
      status: IntegrationStatus.CONNECTED,
      accessToken: this.encryptToken(accessToken),
      refreshToken: this.encryptToken(refreshToken),
      tokenExpiresAt: expiresAt,
      scopes,
    });
    return this.repo.save(integration);
  }

  async disconnectIntegration(id: string) {
    await this.repo.update(id, { status: IntegrationStatus.DISCONNECTED });
    return { disconnected: true };
  }

  async refreshToken(integration: Integration) {
    // call provider-specific refresh logic
    // update accessToken and tokenExpiresAt
  }
}
