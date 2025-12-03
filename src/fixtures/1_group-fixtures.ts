import { Knex } from 'knex';

const tableName = 'group';

export async function seed(knex: Knex): Promise<void> {
  const [{ count }] = await knex(tableName).count();
  if (Number(count) > 0) return;

  await knex(tableName).insert([
    {
      name: 'Test Group - Global',
      group_id: '-1002537156394',
      telegram_link: 'https://t.me/+AUSqVVJAh8E3N2Y1',
      category: 'global',
    },
    {
      name: 'Test Group - Sri Lanka',
      group_id: '-1002537156395',
      telegram_link: 'https://t.me/+example1',
      category: 'sri_lanka',
    },
    {
      name: 'Test Group - VIP',
      group_id: '-1002537156396',
      telegram_link: 'https://t.me/+example2',
      category: 'vip',
    },
  ]);
}
