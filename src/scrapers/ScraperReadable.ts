import { Browser, firefox, Page } from 'playwright';
import { Readable, ReadableOptions } from 'stream';
import { PropertyWithoutId } from '../types';

export abstract class ScraperReadable extends Readable {
  page: Page;
  browser: Browser;
  protected urlsToRead: string[] = [];
  protected readProperties: PropertyWithoutId[] = [];

  constructor(options?: Omit<ReadableOptions, 'objectMode' | 'read' | 'destroy' | 'construct'>) {
    super({
      ...options,
      objectMode: true,
    });
  }

  abstract _initialize(): Promise<void>;

  async _construct(callback: (error?: Error | null | undefined) => void): Promise<void> {
    try {
      this.browser = await firefox.launch({
        headless: false,
      });
      this.page = await this.browser.newPage();
      await this._initialize();

      return callback();
    } catch (error) {
      if (!(error instanceof Error)) return callback(new Error('Unknown error'));

      return callback(error);
    }
  }
}
