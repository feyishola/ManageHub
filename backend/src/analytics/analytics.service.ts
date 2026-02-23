import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { OverviewAggregator } from './aggregators/overview.aggregator';
import { RetentionAggregator } from './aggregators/retention.aggregator';

@Injectable()
export class AnalyticsService implements OnModuleInit {
    constructor(
        @InjectRepository(AnalyticsEvent)
        private analyticsRepository: Repository<AnalyticsEvent>,
        private dataSource: DataSource,
        private overviewAggregator: OverviewAggregator,
        private retentionAggregator: RetentionAggregator,
    ) { }

    async onModuleInit() {
        await this.setupPartitioning();
        await this.setupMaterializedViews();
    }

    private async setupPartitioning() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            // Check if table exists and its partitioning status
            const tableInfo = await queryRunner.query(`
        SELECT relkind FROM pg_class WHERE relname = 'analytics_events'
      `);

            if (tableInfo.length === 0) {
                // Table doesn't exist, we can't create it as partitioned here easily because TypeORM will try to sync it.
                // But we can create partitions if it IS partitioned.
                return;
            }

            // Logic to create next month's partition
            const nextMonthDate = new Date();
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            const year = nextMonthDate.getFullYear();
            const month = (nextMonthDate.getMonth() + 1).toString().padStart(2, '0');
            const partitionName = `analytics_events_y${year}m${month}`;
            const startDate = `${year}-${month}-01`;
            const endDate = new Date(year, nextMonthDate.getMonth() + 1, 1).toISOString().split('T')[0];

            // Note: This assumes the parent table was created with PARTITION BY RANGE (createdAt)
            // To fully support this, synchronize: false should be set for the entity and a migration used.
            // For this implementation, we demonstrate the partition management logic.
            try {
                await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "${partitionName}" 
          PARTITION OF analytics_events 
          FOR VALUES FROM ('${startDate}') TO ('${endDate}')
        `);
            } catch (e) {
                // If parent is not partitioned, this will fail gracefully
            }
        } finally {
            await queryRunner.release();
        }
    }

    private async setupMaterializedViews() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            await queryRunner.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_overview_daily AS
        SELECT 
          DATE_TRUNC('day', "createdAt") as day,
          event,
          COUNT(*) as count,
          SUM(CASE WHEN (properties->>'amount') IS NOT NULL THEN (properties->>'amount')::numeric ELSE 0 END) as revenue
        FROM analytics_events
        GROUP BY 1, 2
        WITH NO DATA;
      `);

            // Initial refresh
            await queryRunner.query('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_overview_daily').catch(() => {
                return queryRunner.query('REFRESH MATERIALIZED VIEW analytics_overview_daily');
            });
        } catch (e) {
            console.error('Materialized view setup failed:', e);
        } finally {
            await queryRunner.release();
        }
    }

    async track(dto: TrackEventDto) {
        const event = this.analyticsRepository.create({
            ...dto,
            createdAt: new Date(),
        });
        return this.analyticsRepository.save(event);
    }

    async getEvents(query: AnalyticsQueryDto) {
        const { event, from, to } = query;
        const where: any = {};
        if (event) where.event = event;
        if (from && to) {
            where.createdAt = Between(new Date(from), new Date(to));
        } else if (from) {
            where.createdAt = Between(new Date(from), new Date());
        }

        return this.analyticsRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    async getOverview(from?: string, to?: string) {
        return this.overviewAggregator.getOverview(from, to);
    }

    async getRetention() {
        return this.retentionAggregator.getRetention();
    }
}
