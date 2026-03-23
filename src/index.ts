import { promises as fs } from 'fs';
import { program } from 'commander';

import {
  getLastPageNumber,
  getRestaurantDetailsFromUrl,
  getRestaurantUrls,
} from './scraper.js';
import pMap from 'p-map';
import { sleep } from './utils.js';

const URLS_PATH = 'data/restaurant-urls.json';
const OUTPUT_PATH = 'data/restaurants.json';
const DELAY_BETWEEN_PAGES_IN_MILLISECONDS = 1_000;

async function loadJsonFile<T>(path: string): Promise<T | null> {
  try {
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function saveJsonFile(path: string, data: unknown): Promise<void> {
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

program
  .command('fetch-urls')
  .description('Fetch restaurant URLs from the Michelin Guide and save them to disk')
  .option(
    '-p, --max-pages <maxPages>',
    'Limit the number of pages of restaurants to fetch. If not set, all pages will be fetched.',
    (value) => parseInt(value, 10),
  )
  .option(
    '-l, --limit <limit>',
    'Limit the number of restaurant URLs returned. If not set, all URLs will be returned.',
    (value) => parseInt(value, 10),
  )
  .action(async (options: { maxPages?: number; limit?: number }) => {
    console.log('Fetching restaurant URLs...');

    const lastPageNumber = await getLastPageNumber();
    console.log(`Found ${lastPageNumber} page(s) of restaurants`);

    const effectiveLastPage = options.maxPages
      ? Math.min(lastPageNumber, options.maxPages)
      : lastPageNumber;

    const restaurantUrls = await getRestaurantUrls({
      lastPageNumber: effectiveLastPage,
      limit: options.limit,
      delayBetweenPagesInMilliseconds: DELAY_BETWEEN_PAGES_IN_MILLISECONDS,
    });

    const urls = [...restaurantUrls];
    await saveJsonFile(URLS_PATH, urls);
    console.log(`Saved ${urls.length} restaurant URL(s) to ${URLS_PATH}`);
  });

program
  .command('fetch-details')
  .description(
    'Fetch restaurant details from previously saved URLs. Automatically resumes from where it left off.',
  )
  .option(
    '-c, --concurrency <concurrency>',
    'Control the number of concurrent requests when loading restaurants. Defaults to 2.',
    (value) => parseInt(value, 10),
    2,
  )
  .action(async (options: { concurrency: number }) => {
    const urls = await loadJsonFile<string[]>(URLS_PATH);

    if (!urls || urls.length === 0) {
      console.error(`No URLs found. Run "fetch-urls" first to generate ${URLS_PATH}.`);
      process.exit(1);
    }

    console.log(`Loaded ${urls.length} restaurant URL(s) from ${URLS_PATH}`);

    // Load existing results for resumability
    const existingRestaurants =
      (await loadJsonFile<Record<string, unknown>[]>(OUTPUT_PATH)) ?? [];
    const fetchedUrls = new Set(
      existingRestaurants.map((r) => r._sourceUrl as string).filter(Boolean),
    );

    const remainingUrls = urls.filter((url) => !fetchedUrls.has(url));

    if (remainingUrls.length === 0) {
      console.log(
        `All ${urls.length} restaurant(s) have already been fetched. Nothing to do.`,
      );
      return;
    }

    console.log(
      `${existingRestaurants.length} already fetched, ${remainingUrls.length} remaining`,
    );

    const restaurants = [...existingRestaurants];
    const failedUrls: string[] = [];
    let newCount = 0;

    await pMap(
      remainingUrls,
      async (url, index) => {
        await sleep(DELAY_BETWEEN_PAGES_IN_MILLISECONDS);

        console.log(
          `Loading restaurant ${index + 1}/${remainingUrls.length} from ${url}`,
        );

        try {
          const details = await getRestaurantDetailsFromUrl(url);
          restaurants.push({ ...details, _sourceUrl: url });
          newCount++;

          // Save after each successful fetch for crash-safe resumability
          await saveJsonFile(OUTPUT_PATH, restaurants);
        } catch (e) {
          console.error(
            `Failed to load restaurant ${index + 1}/${remainingUrls.length} from ${url}: ${e}`,
          );
          failedUrls.push(url);
        }
      },
      { concurrency: options.concurrency },
    );

    console.log(
      `Done. ${newCount} new restaurant(s) fetched, ${restaurants.length} total in ${OUTPUT_PATH}`,
    );

    if (failedUrls.length > 0) {
      console.error(
        `Failed to load ${failedUrls.length} restaurant(s) — re-run to retry:`,
        failedUrls,
      );
    }
  });

program.parse(process.argv);
