import { Response } from 'undici';

export const validateResponse = (response: Response) => {
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${response.url} - expected "200 OK", got "${response.status} ${response.statusText}"`,
    );
  }
};

export const sleep = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export const getNumbersBetween = (x: number, y: number): number[] => {
  const numbers: number[] = [];
  for (let i = x; i <= y; i++) {
    numbers.push(i);
  }
  return numbers;
};
