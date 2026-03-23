import { fetch, RequestInit, Response } from 'undici';

const MAX_RETRIES = 7;
const TIMEOUT = 10000;
const BASE_RETRY_DELAY_MS = 3_000;

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

async function fetchWithTimeoutAndRetry(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  let response: Response | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT);

      response = await fetch(url, {
        ...options,
        headers: { ...BROWSER_HEADERS, ...(options?.headers as Record<string, string>) },
        signal: controller.signal,
      });
      clearTimeout(id);

      if (response.status !== 200) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.startsWith('Request failed'))
      ) {
        console.log(
          `Request to ${url} failed, retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`  Waiting ${(delay / 1000).toFixed(0)}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Fetching ${url} failed after ${MAX_RETRIES} attempts - expected "200 OK", got "${response?.status} ${response?.statusText}"`,
  );
}

export default fetchWithTimeoutAndRetry;
