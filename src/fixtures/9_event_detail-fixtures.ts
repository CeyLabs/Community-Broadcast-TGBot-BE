import { Knex } from 'knex';

const tableName = 'event_detail';

export async function seed(knex: Knex): Promise<void> {
  const [{ count }] = await knex(tableName).count();
  if (Number(count) > 0) return;

  await knex(tableName).insert({
    group_id: '-1002537156394',
    is_one_person: true,
    name: 'Community Event 2025',
    slug: 'community-event-2025',
    image_url: 'https://example.com/image.jpg',
    start_time: '10:00',
    end_time: '18:00',
    timezone: 'UTC',
    address: '123 Main St',
    location: 'Virtual',
    year: 2025,
  });
}
