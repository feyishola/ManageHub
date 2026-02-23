import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { DiskHealthIndicator } from './indicators/disk.indicator';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
    ConfigModule,
  ],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, DiskHealthIndicator],
})
export class HealthModule {}
