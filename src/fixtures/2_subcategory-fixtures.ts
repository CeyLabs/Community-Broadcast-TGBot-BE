/**
 * @fileoverview Subcategory fixtures for seeding the database
 * @module fixtures/subcategory
 */

import { Knex } from 'knex';

const TABLE_NAME = 'subcategory';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  const categoryId = '00000000-0000-0000-0000-000000000001'; // Global category

  // Insert subcategories
  await knex(TABLE_NAME).insert([
    {
      id: '00000000-0000-0000-0001-000000000001',
      name: 'Other',
      category_id: categoryId,
      has_group_categories: false, // Direct groups only
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      name: 'Sri Lanka',
      category_id: categoryId,
      has_group_categories: true, // Has nested group categories (Ceylon Cash, Community)
    },
    {
      id: '00000000-0000-0000-0001-000000000003',
      name: 'Clients',
      category_id: categoryId,
      has_group_categories: false, // Direct groups only (partner groups)
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table`);
}
