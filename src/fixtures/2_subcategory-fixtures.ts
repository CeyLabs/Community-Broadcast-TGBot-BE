/**
 * @fileoverview Subcategory fixtures for seeding the database
 * @module fixtures/subcategory
 */

import { Knex } from 'knex';

const TABLE_NAME = 'subcategory';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  const sriLankaCategoryId = '00000000-0000-0000-0001-000000000002'; // Sri Lanka category

  // Insert subcategories (only for categories with has_subcategories=true)
  await knex(TABLE_NAME).insert([
    {
      id: '00000000-0000-0000-0002-000000000001',
      name: 'Ceylon Cash',
      category_id: sriLankaCategoryId,
    },
    {
      id: '00000000-0000-0000-0002-000000000002',
      name: 'Community',
      category_id: sriLankaCategoryId,
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table`);
}
