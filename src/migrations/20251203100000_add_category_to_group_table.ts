import type { Knex } from 'knex';

const tableName = 'group';

export async function up(knex: Knex): Promise<void> {
  // Create enum type for group categories
  await knex.raw(`
    CREATE TYPE group_category AS ENUM ('global', 'sri_lanka', 'vip')
  `);

  // Add category column to group table
  await knex.schema.alterTable(tableName, (table) => {
    table
      .specificType('category', 'group_category')
      .notNullable()
      .defaultTo('global');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, (table) => {
    table.dropColumn('category');
  });

  await knex.raw('DROP TYPE IF EXISTS group_category');
}
