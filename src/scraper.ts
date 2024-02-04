import { getNumbersBetween, sleep, validateResponse } from './utils.js';
import fetch from './fetch.js';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://guide.michelin.com';
const INITIAL_URL = 'https://guide.michelin.com/gb/en/restaurants';

export const getLastPageNumber = async (): Promise<number> => {
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

export const getRestaurantUrlsOnPage = async (pageNumber: number): Promise<string[]> => {
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

type Restaurant = Record<string, unknown>;

export const getRestaurantDetailsFromUrl = async (
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

export const getRestaurantUrls = async ({
  lastPageNumber,
  limit,
  delayBetweenPagesInMilliseconds,
}: {
  lastPageNumber: number;
  limit: number | undefined;
  delayBetweenPagesInMilliseconds: number;
}): Promise<Set<string>> => {
  const pageNumbers = getNumbersBetween(1, lastPageNumber);

  const restaurantUrls = new Set<string>();

  for (const pageNumber of pageNumbers) {
    console.log(`Fetching page ${pageNumber}/${lastPageNumber}...`);
    const urls = await getRestaurantUrlsOnPage(pageNumber);

    for (const url of urls) {
      restaurantUrls.add(url);

      if (limit && restaurantUrls.size >= limit) {
        return restaurantUrls;
      }
    }

    await sleep(delayBetweenPagesInMilliseconds);
  }

  return restaurantUrls;
};

export const getRestaurants = async ({
  restaurantUrls,
  delayBetweenPagesInMilliseconds,
}: {
  restaurantUrls: Set<string>;
  delayBetweenPagesInMilliseconds: number;
}): Promise<Restaurant[]> => {
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

    await sleep(delayBetweenPagesInMilliseconds);
  }

  return restaurants;
};
