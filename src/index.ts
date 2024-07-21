import { promises as fs } from 'fs';
import { program } from 'commander';

import {
  getLastPageNumber,
  getRestaurantDetailsFromUrl,
  getRestaurantUrls,
} from './scraper.js';
import pMap from 'p-map';
import { sleep } from './utils.js';

const OUTPUT_PATH = 'data/restaurants.json';
const DELAY_BETWEEN_PAGES_IN_MILLISECONDS = 1_000;

interface Options {
  limit?: number;
  concurrency: number;
}

program
  .option(
    '-c, --concurrency <concurrency>',
    'Control the number of concurrent requests when loading restaurants. Defaults to 2.',
    (value) => parseInt(value, 10),
    2,
  )
  .option(
    '-l, --limit <limit>',
    'Limit the number of restaurants returned. If not set, all restaurants will be returned.',
    (value) => parseInt(value, 10),
  )
  .parse(process.argv);

const { concurrency, limit } = program.opts() as Options;

(async () => {
  console.log('Starting scraper...');

  const lastPageNumber = await getLastPageNumber();
  console.log(`Found ${lastPageNumber} page(s) of restaurants`);

  if (limit) {
    console.log(`Fetching URLs of first ${limit} restaurant(s)...`);
  } else {
    console.log('Fetching restaurant URLs...');
  }

  const restaurantUrls = await getRestaurantUrls({
    lastPageNumber,
    limit,
    delayBetweenPagesInMilliseconds: DELAY_BETWEEN_PAGES_IN_MILLISECONDS,
  });

  console.log(`Found ${restaurantUrls.size} restaurant(s)`);

  const failedUrls: string[] = [];

  const restaurants = (
    await pMap(
      restaurantUrls,
      async (url, index) => {
        await sleep(DELAY_BETWEEN_PAGES_IN_MILLISECONDS);

        console.log(`Loading restaurant ${index + 1}/${restaurantUrls.size} from ${url}`);

        try {
          return await getRestaurantDetailsFromUrl(url);
        } catch (e) {
          console.error(
            `Failed to load restaurant ${index + 1}/${restaurantUrls.size} from ${url}: ${e}`,
          );
          failedUrls.push(url);
          return null;
        }
      },
      { concurrency },
    )
  ).filter((x) => x);

  console.log(`Writing ${restaurants.length} restaurant(s) to ${OUTPUT_PATH}`);

  if (failedUrls.length > 0) {
    console.error(`Failed to load ${failedUrls.length} restaurant(s)`, failedUrls);
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(restaurants, null, 2));
})();
