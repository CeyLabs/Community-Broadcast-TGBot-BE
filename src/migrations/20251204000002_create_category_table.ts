import type { Knex } from 'knex';

const tableName = 'category';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable().unique();
    table.boolean('has_subcategories').notNullable().defaultTo(false);
    table.timestamps(true, true);

    table.index('name', 'idx_category_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
}
