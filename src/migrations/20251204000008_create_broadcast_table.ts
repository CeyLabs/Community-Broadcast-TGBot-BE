import type { Knex } from 'knex';

const tableName = 'broadcast';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary();
    table
      .enu(
        'message_type',
        [
          'text',
          'photo',
          'video',
          'audio',
          'document',
          'animation',
          'voice',
          'location',
          'contact',
          'sticker',
        ],
        {
          useNative: true,
          enumName: 'enum_broadcast_message_type',
        },
      )
      .notNullable();
    table.string('message_text');
    table.jsonb('button_detail');
    table.jsonb('attachment_detail');
    table
      .string('sender_id')
      .notNullable()
      .references('telegram_id')
      .inTable('user')
      .onDelete('CASCADE');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
  await knex.raw('DROP TYPE IF EXISTS enum_broadcast_message_type');
}
