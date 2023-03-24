export abstract class Scraper<T> {
  abstract initialize(): Promise<void>;
  abstract scrape(): Promise<T[]>;
  abstract destroy(): Promise<void>;
}
