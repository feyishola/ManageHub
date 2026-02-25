import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RetentionAggregator {
    constructor(private dataSource: DataSource) { }

    async getRetention() {
        // Cohort retention query
        // Cohort = month of first activity (signup)
        // Retention = months after first activity where user had any activity

        const query = `
      WITH user_cohorts AS (
        SELECT "userId", DATE_TRUNC('month', MIN("createdAt")) as cohort_month
        FROM analytics_events
        WHERE "userId" IS NOT NULL
        GROUP BY 1
      ),
      user_activity AS (
        SELECT DISTINCT "userId", DATE_TRUNC('month', "createdAt") as activity_month
        FROM analytics_events
        WHERE "userId" IS NOT NULL
      ),
      cohort_sizes AS (
        SELECT cohort_month, COUNT(*) as cohort_size
        FROM user_cohorts
        GROUP BY 1
      ),
      retention AS (
        SELECT
          c.cohort_month,
          EXTRACT(YEAR FROM a.activity_month) * 12 + EXTRACT(MONTH FROM a.activity_month) -
          (EXTRACT(YEAR FROM c.cohort_month) * 12 + EXTRACT(MONTH FROM c.cohort_month)) as month_number,
          COUNT(DISTINCT a."userId") as active_users
        FROM user_cohorts c
        JOIN user_activity a ON c."userId" = a."userId"
        GROUP BY 1, 2
      )
      SELECT
        TO_CHAR(r.cohort_month, 'YYYY-MM') as cohort,
        s.cohort_size,
        r.month_number,
        r.active_users,
        ROUND((r.active_users::numeric / s.cohort_size) * 100, 2) as retention_rate
      FROM retention r
      JOIN cohort_sizes s ON r.cohort_month = s.cohort_month
      ORDER BY r.cohort_month DESC, r.month_number ASC;
    `;

        return this.dataSource.query(query);
    }
}
