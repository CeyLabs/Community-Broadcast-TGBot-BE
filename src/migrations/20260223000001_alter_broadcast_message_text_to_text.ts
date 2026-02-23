import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('broadcast', (table) => {
    table.text('message_text').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('broadcast', (table) => {
    table.string('message_text').alter();
  });
}
