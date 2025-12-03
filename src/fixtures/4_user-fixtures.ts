import { Knex } from 'knex';

const tableName = 'user';

export async function seed(knex: Knex): Promise<void> {
  const [{ count }] = await knex(tableName).count();
  if (Number(count) > 0) return;

  await knex(tableName).insert([
    {
      telegram_id: '1180327057',
      username: 'Nimsara',
      tg_first_name: 'Nimsara',
      tg_last_name: '',
    },
    {
      telegram_id: '1241473040',
      username: 'helloscoopa',
      tg_first_name: 'Scoopa',
      tg_last_name: '',
    },
  ]);
}
