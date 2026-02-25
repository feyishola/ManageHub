import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BillingProfile } from './entities/billing-profile.entity';
import { TaxRate } from './entities/tax-rate.entity';
import { UpsertBillingProfileDto } from './dto/upsert-billing-profile.dto';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingProfile) private readonly profileRepo: Repository<BillingProfile>,
    @InjectRepository(TaxRate) private readonly taxRepo: Repository<TaxRate>,
  ) {}

  private encryptTaxId(taxId: string): string {
    if (!taxId) return null;
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.TAX_SECRET!, 'hex'),
      Buffer.from(process.env.TAX_IV!, 'hex'),
    );
    return Buffer.concat([cipher.update(taxId, 'utf8'), cipher.final()]).toString('hex');
  }

  async upsertProfile(userId: string, dto: UpsertBillingProfileDto) {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (dto.taxId) dto.taxId = this.encryptTaxId(dto.taxId);

    if (profile) {
      Object.assign(profile, dto);
      return this.profileRepo.save(profile);
    }
    profile = this.profileRepo.create({ userId, ...dto });
    return this.profileRepo.save(profile);
  }

  async getProfile(userId: string) {
    return this.profileRepo.findOne({ where: { userId } });
  }

  async createTaxRate(dto: CreateTaxRateDto) {
    const rate = this.taxRepo.create(dto);
    return this.taxRepo.save(rate);
  }

  async listTaxRates(country: string) {
    return this.taxRepo.find({ where: { country, isActive: true } });
  }

  async calculateTax(amount: number, country: string, region?: string) {
    const rates = await this.taxRepo.find({ where: { country, isActive: true } });
    let totalRate = 0;
    let taxAmount = 0;

    for (const rate of rates) {
      if (region && rate.region && rate.region !== region) continue;
      if (rate.isCompound) {
        taxAmount += (amount + taxAmount) * (rate.rate / 100);
      } else {
        taxAmount += amount * (rate.rate / 100);
      }
      totalRate += rate.rate;
    }

    return { totalRate, taxAmount };
  }
}
