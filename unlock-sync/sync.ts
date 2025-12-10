import axios from 'axios';
const csv = require('csv-parser');
import knex from 'knex';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

interface CSVRow {
  [key: string]: string;
  'Group ID': string;
  City: string;
  Country: string;
}

const START_ROW = 2;
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTFiB1KFJmcH5TyCgI86l2PscPhgesWdPVzGid8_D_WuDy3zJXNSOgFGuEo_dl7B4Xifnk-aqyGR9hw/pub?output=csv';

// Initialize Knex with environment variables
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    user: process.env.PG_USER,
    password: process.env.PG_PW,
    database: process.env.PG_DB,
  },
});

/**
 * Reads CSV data from a URL starting from a specified row
 */
async function readCSVFromURL(url: string, startRow: number = 1): Promise<CSVRow[]> {
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
      const results: CSVRow[] = [];
      let currentRow = 0;

      response.data
        .pipe(csv())
        .on('data', (data: CSVRow) => {
          currentRow++;
          if (currentRow >= startRow) {
            results.push(data);
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error: Error) => {
          reject(error);
        });
    });
  } catch (error) {
    throw new Error(
      `Failed to fetch CSV: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Processes CSV data and writes to database
 */
async function processCSVData(data: CSVRow[]): Promise<void> {
  for (const row of data) {
    const groupId = row['Group ID'].replace('#', '');
    if (!groupId) continue;

    const existingCity = await db('city').where('group_id', groupId).first();
    if (!existingCity) {
      console.log(`WARN: City ${row['City']} not found in db, skipping...`);
      continue;
    }

    // Event detail processing has been removed
    console.log(`OK: City ${row['City']} already synced.`);
  }
}

// Main function
async function main(): Promise<void> {
  try {
    console.log('Reading CSV...');
    const data = await readCSVFromURL(CSV_URL, START_ROW);
    console.log(`${data.length} events found.\n`);
    await processCSVData(data);
    console.log('CSV processing completed');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await db.destroy();
  }
}

main();
