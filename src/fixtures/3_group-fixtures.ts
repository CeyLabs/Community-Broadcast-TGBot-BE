/**
 * @fileoverview Group fixtures for seeding the database with example groups
 * @module fixtures/group
 */

import { Knex } from 'knex';

const TABLE_NAME = 'telegram_group';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  // Category IDs
  const otherCategoryId = '00000000-0000-0000-0001-000000000001';
  const clientsCategoryId = '00000000-0000-0000-0001-000000000003';

  // Subcategory IDs (under Sri Lanka)
  const ceylonCashSubcategoryId = '00000000-0000-0000-0002-000000000001';
  const communitySubcategoryId = '00000000-0000-0000-0002-000000000002';

  // Insert sample groups
  await knex(TABLE_NAME).insert([
    // Other category (direct groups)
    {
      name: 'General Chat',
      group_id: '-1002537156394',
      telegram_link: 'https://t.me/generalchat',
      category_id: otherCategoryId,
      subcategory_id: null,
    },

    // Clients category (partner groups - direct)
    {
      name: 'Partner Group 1',
      group_id: '-1001234567891',
      telegram_link: 'https://t.me/partner1',
      category_id: clientsCategoryId,
      subcategory_id: null,
    },

    // Ceylon Cash subcategory (under Sri Lanka)
    {
      name: 'Ceylon Cash Main',
      group_id: '-1001234567892',
      telegram_link: 'https://t.me/ceyloncash',
      category_id: null,
      subcategory_id: ceylonCashSubcategoryId,
    },
    {
      name: 'Ceylon Cash Announcements',
      group_id: '-1001234567893',
      telegram_link: 'https://t.me/ceyloncashann',
      category_id: null,
      subcategory_id: ceylonCashSubcategoryId,
    },

    // Community subcategory (under Sri Lanka)
    {
      name: 'Sri Lanka Community',
      group_id: '-1001234567894',
      telegram_link: 'https://t.me/slcommunity',
      category_id: null,
      subcategory_id: communitySubcategoryId,
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table with example groups`);
}
