import type { Knex } from 'knex';

const tableName = 'group_category';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table
      .uuid('subcategory_id')
      .notNullable()
      .references('id')
      .inTable('subcategory')
      .onDelete('CASCADE');
    table.timestamps(true, true);

    table.index('subcategory_id', 'idx_group_category_subcategory_id');
    table.index('name', 'idx_group_category_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
}
