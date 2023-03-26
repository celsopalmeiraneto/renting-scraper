import { randomInt } from 'node:crypto';

export abstract class Scraper<T> {
  abstract initialize(): Promise<void>;
  abstract scrape(): Promise<T[]>;
  abstract destroy(): Promise<void>;

  protected async sleep(min = 2000, max = 4000) {
    return new Promise((resolve) => setTimeout(resolve, randomInt(min, max)));
  }
}
