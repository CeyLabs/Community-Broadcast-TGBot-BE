import type { Knex } from 'knex';

const tableName = 'subcategory';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table
      .uuid('category_id')
      .notNullable()
      .references('id')
      .inTable('category')
      .onDelete('CASCADE');
    table.timestamps(true, true);

    table.index('category_id', 'idx_subcategory_category_id');
    table.index('name', 'idx_subcategory_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
}
