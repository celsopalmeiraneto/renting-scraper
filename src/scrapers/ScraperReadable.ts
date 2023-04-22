import { Browser, firefox, Page } from 'playwright';
import { Readable, ReadableOptions } from 'stream';
import { PropertyWithoutId } from '../types';
import { Context } from 'vm';

export abstract class ScraperReadable extends Readable {
  browser: Browser;
  context: Context;
  page: Page;
  protected urlsToRead: string[] = [];
  protected readProperties: PropertyWithoutId[] = [];

  constructor(options?: Omit<ReadableOptions, 'objectMode' | 'read' | 'destroy' | 'construct'>) {
    super({
      ...options,
      objectMode: true,
    });
  }

  abstract _initialize(): Promise<void>;

  abstract readResultsPage(): Promise<boolean>;

  async _construct(callback: (error?: Error | null | undefined) => void): Promise<void> {
    try {
      this.browser = await firefox.launch({
        headless: process.env.HEADLESS === 'false' ? false : true,
      });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
      await this._initialize();

      return callback();
    } catch (error) {
      if (!(error instanceof Error)) return callback(new Error('Unknown error'));

      return callback(error);
    }
  }

  private flushReadProperties() {
    let keepPushing = true;
    while (keepPushing && this.readProperties.length > 0) {
      const property = this.readProperties.shift();
      if (property) {
        keepPushing = this.push(property);
      }
    }
  }

  async _read() {
    try {
      await this.readResultsPage();
      const property = this.readProperties.shift();
      this.push(property ?? null);
    } catch (error) {
      this.flushReadProperties();
      if (error instanceof Error) return this.destroy(error);
      return this.destroy(new Error('Unknown error'));
    }
  }

  async _destroy(
    error: Error | null,
    callback: (error?: Error | null | undefined) => void,
  ): Promise<void> {
    await this.browser.close();
    return callback(error);
  }
}
