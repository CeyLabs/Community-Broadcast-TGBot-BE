/**
 * @fileoverview User fixtures for seeding the database
 * @module fixtures/user
 */

import { Knex } from 'knex';

const TABLE_NAME = 'user';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  // Insert sample users (admins)
  await knex(TABLE_NAME).insert([
    {
      telegram_id: '123456789',
      username: 'admin_user',
      tg_first_name: 'Admin',
      tg_last_name: 'User',
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table`);
}
