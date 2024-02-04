import { promises as fs } from 'fs';
import { program } from 'commander';

import { getLastPageNumber, getRestaurantUrls, getRestaurants } from './scraper.js';

const OUTPUT_PATH = 'data/restaurants.json';
const DELAY_BETWEEN_PAGES_IN_MILLISECONDS = 1_000;

interface Options {
  limit?: number;
}

program
  .option(
    '-l, --limit <limit>',
    'Limit the number of restaurants returned. If not set, all restaurants will be returned.',
    (value) => parseInt(value, 10),
  )
  .parse(process.argv);

const { limit } = program.opts() as Options;

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

  const restaurants = await getRestaurants({
    restaurantUrls,
    delayBetweenPagesInMilliseconds: DELAY_BETWEEN_PAGES_IN_MILLISECONDS,
  });

  console.log(`Writing ${restaurants.length} restaurant(s) to ${OUTPUT_PATH}`);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(restaurants, null, 2));
})();
