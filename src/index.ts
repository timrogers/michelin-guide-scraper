import { Response } from 'undici';
import fetch from './fetch.js';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';

const BASE_URL = 'https://guide.michelin.com';
const INITIAL_URL = 'https://guide.michelin.com/gb/en/restaurants';
const OUTPUT_PATH = 'data/restaurants.json';
const DELAY_BETWEEN_PAGES_IN_MILLISECONDS = 1_000;

const validateResponse = (response: Response) => {
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${response.url} - expected "200 OK", got "${response.status} ${response.statusText}"`,
    );
  }
};

const sleep = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const getLastPageNumber = async (): Promise<number> => {
  const response = await fetch(INITIAL_URL);
  validateResponse(response);

  if (!response.ok) {
    throw new Error('Failed to fetch initial page');
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const pageLinks = $('.pagination a.btn');
  const lastPageLink = pageLinks[pageLinks.length - 2];

  if (lastPageLink) {
    return parseInt($(lastPageLink).text());
  } else {
    throw new Error(`Failed to find last page link at ${INITIAL_URL}`);
  }
};

const getRestaurantUrlsOnPage = async (pageNumber: number): Promise<string[]> => {
  const response = await fetch(`${INITIAL_URL}/page/${pageNumber}`);
  validateResponse(response);

  const html = await response.text();
  const $ = cheerio.load(html);
  const restaurantLinks = $('.card__menu > a');

  console.log(`Found ${restaurantLinks.length} restaurant(s) on page ${pageNumber}`);

  return restaurantLinks
    .map((_, a) => $(a).attr('href') as string)
    .toArray()
    .map((url) => `${BASE_URL}${url}`);
};

const getNumbersBetween = (x: number, y: number): number[] => {
  const numbers: number[] = [];
  for (let i = x; i <= y; i++) {
    numbers.push(i);
  }
  return numbers;
};

interface Restaurant {
  name: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressRegion: string;
    addressCountry: string;
  };
  image: string;
  telephone: string;
  knowsLanguage: string;
  acceptsReservations: string;
  servesCuisine: string;
  url: string;
  currenciesAccepted: string;
  paymentAccepted: string;
  award: string;
  brand: string;
  hasDriveThroughService: string;
}

const getRestaurantDetailsFromUrl = async (
  url: string,
): Promise<Restaurant | undefined> => {
  try {
    const response = await fetch(url);
    validateResponse(response);

    const html = await response.text();
    const $ = cheerio.load(html);
    const metadataJson = $('script[type="application/ld+json"]').html();

    if (!metadataJson) {
      throw new Error(`Failed to find metadata JSON at ${url}`);
    }

    return JSON.parse(metadataJson) as Restaurant;
  } catch (e) {
    console.error(`Failed to fetch restaurant details from ${url}`);
    console.error(e);
  }
};

const getRestaurantUrls = async (lastPageNumber: number): Promise<Set<string>> => {
  const pageNumbers = getNumbersBetween(1, lastPageNumber);

  const restaurantUrls = new Set<string>();

  for (const pageNumber of pageNumbers) {
    console.log(`Fetching page ${pageNumber}/${lastPageNumber}...`);
    const urls = await getRestaurantUrlsOnPage(pageNumber);
    urls.forEach((url) => restaurantUrls.add(url));

    await sleep(DELAY_BETWEEN_PAGES_IN_MILLISECONDS);
  }

  return restaurantUrls;
};

const getRestaurants = async (restaurantUrls: Set<string>): Promise<Restaurant[]> => {
  const restaurants: Restaurant[] = [];

  const restaurantsCount = restaurantUrls.size;
  const restaurantUrlsArray = Array.from(restaurantUrls);

  for (let index = 0; index < restaurantUrlsArray.length; index++) {
    const url = restaurantUrlsArray[index];
    console.log(
      `Fetching restaurant details from ${url} (${index + 1}/${restaurantsCount})...`,
    );
    const restaurant = await getRestaurantDetailsFromUrl(url);
    if (restaurant) restaurants.push(restaurant);

    await sleep(DELAY_BETWEEN_PAGES_IN_MILLISECONDS);
  }

  return restaurants;
};

(async () => {
  console.log('Starting scraper...');

  const lastPageNumber = await getLastPageNumber();
  console.log(`Found ${lastPageNumber} page(s) of restaurants`);

  const restaurantUrls = await getRestaurantUrls(lastPageNumber);

  console.log(`Found ${restaurantUrls.size} restaurant(s)`);

  const restaurants = await getRestaurants(restaurantUrls);

  console.log(`Writing ${restaurants.length} restaurant(s) to ${OUTPUT_PATH}`);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(restaurants, null, 2));
})();
