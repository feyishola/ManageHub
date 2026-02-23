import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRateLimitsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE apply_to_enum AS ENUM (
        'all',
        'unauthenticated',
        'role:admin',
        'role:user',
        'role:moderator'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'rate_limits',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'route',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'method',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'max_requests',
            type: 'int',
          },
          {
            name: 'window_seconds',
            type: 'int',
          },
          {
            name: 'apply_to',
            type: 'apply_to_enum',
            default: "'all'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'rate_limits',
      new TableIndex({
        name: 'IDX_RATE_LIMITS_ROUTE_METHOD_APPLY_TO',
        columnNames: ['route', 'method', 'apply_to'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('rate_limits', 'IDX_RATE_LIMITS_ROUTE_METHOD_APPLY_TO');
    await queryRunner.dropTable('rate_limits');
    await queryRunner.query(`DROP TYPE apply_to_enum`);
  }
}
