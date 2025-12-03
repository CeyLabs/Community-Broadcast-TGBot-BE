/**
 * @fileoverview Category fixtures for seeding the database
 * @module fixtures/category
 */

import { Knex } from 'knex';

const TABLE_NAME = 'category';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  // Insert categories
  await knex(TABLE_NAME).insert([
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Global',
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table`);
}
