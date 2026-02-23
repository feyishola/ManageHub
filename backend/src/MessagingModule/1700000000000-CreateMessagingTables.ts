import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMessagingTables1700000000000 implements MigrationInterface {
  name = 'CreateMessagingTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── message_threads ──────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'message_threads',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'participantIds',
            type: 'int',
            isArray: true,
          },
          {
            name: 'lastMessageAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'message_threads',
      new TableIndex({
        name: 'IDX_message_threads_lastMessageAt',
        columnNames: ['lastMessageAt'],
      }),
    );

    // ─── messages ─────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'threadId',
            type: 'int',
          },
          {
            name: 'senderId',
            type: 'int',
          },
          {
            name: 'body',
            type: 'text',
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'readAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'deletedBySender',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedByRecipient',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['threadId'],
            referencedTableName: 'message_threads',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_threadId',
        columnNames: ['threadId'],
      }),
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_messages_senderId',
        columnNames: ['senderId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages', true);
    await queryRunner.dropTable('message_threads', true);
  }
}
