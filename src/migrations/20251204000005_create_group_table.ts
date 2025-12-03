import type { Knex } from 'knex';

const tableName = 'group';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table
      .uuid('subcategory_id')
      .nullable()
      .references('id')
      .inTable('subcategory')
      .onDelete('CASCADE');
    table
      .uuid('group_category_id')
      .nullable()
      .references('id')
      .inTable('group_category')
      .onDelete('CASCADE');
    table.string('group_id').notNullable().unique();
    table.string('telegram_link');
    table.timestamps(true, true);

    table.index('subcategory_id', 'idx_group_subcategory_id');
    table.index('group_category_id', 'idx_group_group_category_id');
    table.index('name', 'idx_group_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
}
