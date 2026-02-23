import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { OverviewAggregator } from './aggregators/overview.aggregator';
import { RetentionAggregator } from './aggregators/retention.aggregator';

@Module({
    imports: [TypeOrmModule.forFeature([AnalyticsEvent])],
    controllers: [AnalyticsController],
    providers: [
        AnalyticsService,
        OverviewAggregator,
        RetentionAggregator,
    ],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
