/**
 * @fileoverview Group category fixtures for seeding the database
 * @module fixtures/group_category
 */

import { Knex } from 'knex';

const TABLE_NAME = 'group_category';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  const sriLankaSubcategoryId = '00000000-0000-0000-0001-000000000002'; // Sri Lanka subcategory

  // Insert group categories (only for Sri Lanka)
  await knex(TABLE_NAME).insert([
    {
      id: '00000000-0000-0000-0002-000000000001',
      name: 'Ceylon Cash',
      subcategory_id: sriLankaSubcategoryId,
    },
    {
      id: '00000000-0000-0000-0002-000000000002',
      name: 'Community',
      subcategory_id: sriLankaSubcategoryId,
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table`);
}
