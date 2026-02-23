import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OverviewAggregator {
    constructor(private dataSource: DataSource) { }

    async getOverview(from?: string, to?: string) {
        const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
        const toDate = to ? new Date(to) : new Date();

        // Aggregating metrics from AnalyticsEvent
        // New Users: users who had their first 'session_start' or 'signup' event in this period
        // Revenue: sum of 'amount' property in 'purchase' events
        // Orders: count of 'purchase' events

        // Try to use materialized view for performance if it exists and covers the period
        const results = await this.dataSource.query(`
      SELECT 
        SUM(CASE WHEN event = 'signup' THEN count ELSE 0 END) as new_users,
        SUM(revenue) as revenue,
        SUM(CASE WHEN event = 'purchase' THEN count ELSE 0 END) as orders
      FROM analytics_overview_daily
      WHERE day BETWEEN $1 AND $2
    `).catch(async () => {
            // Fallback to raw table if view doesn't exist or fails
            return this.dataSource.query(`
        SELECT
          COUNT(DISTINCT CASE WHEN event = 'signup' THEN "userId" END) as new_users,
          SUM(CASE WHEN event = 'purchase' THEN (properties->>'amount')::numeric ELSE 0 END) as revenue,
          COUNT(CASE WHEN event = 'purchase' THEN 1 END) as orders
        FROM analytics_events
        WHERE "createdAt" BETWEEN $1 AND $2
      `);
        });

        const row = results[0];
        return {
            newUsers: parseInt(row.new_users || 0),
            revenue: parseFloat(row.revenue || 0),
            orders: parseInt(row.orders || 0),
        };
    }
}
