/**
 * @fileoverview Category fixtures for seeding the database
 * @module fixtures/category
 */

import { Knex } from 'knex';

const TABLE_NAME = 'category';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  // Insert categories (Global is implicit, not in database)
  await knex(TABLE_NAME).insert([
    {
      id: '00000000-0000-0000-0001-000000000001',
      name: 'Other',
      has_subcategories: false, // Direct groups only
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      name: 'Sri Lanka',
      has_subcategories: true, // Has subcategories (Ceylon Cash, Community)
    },
    {
      id: '00000000-0000-0000-0001-000000000003',
      name: 'Clients',
      has_subcategories: false, // Direct groups only (partner groups)
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table`);
}
