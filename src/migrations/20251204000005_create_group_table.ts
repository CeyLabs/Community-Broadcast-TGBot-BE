import type { Knex } from 'knex';

const tableName = 'telegram_group';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.uuid('category_id').nullable().references('id').inTable('category').onDelete('CASCADE');
    table
      .uuid('subcategory_id')
      .nullable()
      .references('id')
      .inTable('subcategory')
      .onDelete('CASCADE');
    table.string('group_id').notNullable().unique();
    table.string('telegram_link');
    table.timestamps(true, true);

    table.index('category_id', 'idx_group_category_id');
    table.index('subcategory_id', 'idx_group_subcategory_id');
    table.index('name', 'idx_group_name');

    // Ensure mutual exclusivity: group can have category_id OR subcategory_id, not both
    table.check(
      '(category_id IS NULL AND subcategory_id IS NOT NULL) OR (category_id IS NOT NULL AND subcategory_id IS NULL)',
      [],
      'chk_group_category_subcategory_exclusivity',
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);
}
