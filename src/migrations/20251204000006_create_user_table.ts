import type { Knex } from 'knex';

const tableName = 'user';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.string('telegram_id').primary();
    table.string('username').unique();
    table.string('tg_first_name');
    table.string('tg_last_name');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
}
