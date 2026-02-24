import { Controller, Post, Put, Get, Body, Req, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { UpsertBillingProfileDto } from './dto/upsert-billing-profile.dto';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { CalculateTaxDto } from './dto/calculate-tax.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post('profile')
  @Put('profile')
  async upsertProfile(@Req() req, @Body() dto: UpsertBillingProfileDto) {
    return this.service.upsertProfile(req.user.id, dto);
  }

  @Get('profile')
  async getProfile(@Req() req) {
    return this.service.getProfile(req.user.id);
  }

  @Post('tax-rates')
  async createTaxRate(@Body() dto: CreateTaxRateDto) {
    // add admin guard here
    return this.service.createTaxRate(dto);
  }

  @Get('tax-rates')
  async listTaxRates(@Query('country') country: string) {
    return this.service.listTaxRates(country);
  }

  @Post('calculate-tax')
  async calculateTax(@Body() dto: CalculateTaxDto) {
    return this.service.calculateTax(dto.amount, dto.country, dto.region);
  }
}
