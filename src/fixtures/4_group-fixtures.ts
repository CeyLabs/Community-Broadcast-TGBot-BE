/**
 * @fileoverview Group fixtures for seeding the database with example groups
 * @module fixtures/group
 */

import { Knex } from 'knex';

const TABLE_NAME = 'group';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex(TABLE_NAME).del();

  // Subcategory IDs
  const otherSubcategoryId = '00000000-0000-0000-0001-000000000001';
  const clientsSubcategoryId = '00000000-0000-0000-0001-000000000003';

  // Group category IDs (under Sri Lanka)
  const ceylonCashGroupCategoryId = '00000000-0000-0000-0002-000000000001';
  const communityGroupCategoryId = '00000000-0000-0000-0002-000000000002';

  // Insert sample groups
  await knex(TABLE_NAME).insert([
    // Other subcategory (direct groups)
    {
      name: 'General Chat',
      group_id: '-1001234567890',
      telegram_link: 'https://t.me/generalchat',
      subcategory_id: otherSubcategoryId,
      group_category_id: null,
    },

    // Clients subcategory (partner groups - direct)
    {
      name: 'Partner Group 1',
      group_id: '-1001234567891',
      telegram_link: 'https://t.me/partner1',
      subcategory_id: clientsSubcategoryId,
      group_category_id: null,
    },

    // Ceylon Cash group category (owner's Sri Lanka groups)
    {
      name: 'Ceylon Cash Main',
      group_id: '-1001234567892',
      telegram_link: 'https://t.me/ceyloncash',
      subcategory_id: null,
      group_category_id: ceylonCashGroupCategoryId,
    },
    {
      name: 'Ceylon Cash Announcements',
      group_id: '-1001234567893',
      telegram_link: 'https://t.me/ceyloncashann',
      subcategory_id: null,
      group_category_id: ceylonCashGroupCategoryId,
    },

    // Community group category (community member's Sri Lanka groups)
    {
      name: 'Sri Lanka Community',
      group_id: '-1001234567894',
      telegram_link: 'https://t.me/slcommunity',
      subcategory_id: null,
      group_category_id: communityGroupCategoryId,
    },
  ]);

  console.log(`✅ Seeded ${TABLE_NAME} table with example groups`);
}
