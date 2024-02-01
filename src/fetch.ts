import { fetch, RequestInit, Response } from 'undici';

const MAX_RETRIES = 5;
const TIMEOUT = 5000; // Timeout in milliseconds

async function fetchWithTimeoutAndRetry(url: string, options?: RequestInit): Promise<Response> {
  let response: Response | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT);

      response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Request timed out, retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Fetching ${url} failed after ${MAX_RETRIES} attempts - expected "200 OK", got "${response?.status} ${response?.statusText}"`);
}

export default fetchWithTimeoutAndRetry;