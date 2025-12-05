import type { Knex } from 'knex';

const tableName = 'broadcast_message_detail';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('broadcast_id')
      .notNullable()
      .references('id')
      .inTable('broadcast')
      .onDelete('CASCADE');
    table.string('message_id');
    table
      .string('group_id')
      .notNullable()
      .references('group_id')
      .inTable('telegram_group')
      .onDelete('CASCADE');
    table.boolean('is_sent').notNullable().defaultTo(false);
    table.timestamp('sent_at');
    table.timestamps(true, true);

    table.index('broadcast_id', 'idx_broadcast_message_detail_broadcast_id');
    table.index('group_id', 'idx_broadcast_message_detail_group_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
}
