import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingProfile } from './entities/billing-profile.entity';
import { TaxRate } from './entities/tax-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BillingProfile, TaxRate])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
