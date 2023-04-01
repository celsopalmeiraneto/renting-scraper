import { randomInt } from 'crypto';
import { Browser, firefox, Locator, Page } from 'playwright';
import { Readable, ReadableOptions } from 'stream';
import { PropertySource, PropertyWithoutId } from '../../types';
import { parsePortugueseNumber } from '../../utils';
import { readTextFromLocator } from '../utils';

const COOKIE_BUTTON_SELECTOR = '#didomi-notice-agree-button';
const IDEALISTA_URL = new URL('https://www.idealista.pt');

export class IdealistaReadable extends Readable {
  page: Page;
  browser: Browser;
  private urlsToRead: string[] = [];
  private readProperties: PropertyWithoutId[] = [];

  constructor(options?: Omit<ReadableOptions, 'objectMode' | 'read' | 'destroy' | 'construct'>) {
    super({
      ...options,
      objectMode: true,
    });
  }

  protected async sleep(min = 2000, max = 4000) {
    return new Promise((resolve) => setTimeout(resolve, randomInt(min, max)));
  }

  private async getNextPageHelpers(page: Page) {
    const nextPageLocator = page.locator('div.pagination a.icon-arrow-right-after').first();
    const hasNextPage = !!(await nextPageLocator.count());

    return { nextPageLocator, hasNextPage };
  }

  private async readAreaFromDetails(
    detailsLocator: Locator,
  ): Promise<PropertyWithoutId['areaInM3']> {
    for (const detail of await detailsLocator.all()) {
      const text = await readTextFromLocator(detail);

      if (!text.includes('m²')) continue;

      return parsePortugueseNumber(text);
    }
    return null;
  }

  async _construct(callback: (error?: Error | null | undefined) => void): Promise<void> {
    try {
      const browser = await firefox.launch({
        headless: false,
      });
      const page = await browser.newPage();
      await page.goto(IDEALISTA_URL.toString());
      const cookieSelector = page.locator(COOKIE_BUTTON_SELECTOR);
      await cookieSelector.waitFor({ state: 'attached' });
      await cookieSelector.click();
      this.page = page;
      this.browser = browser;

      if (!process.env.IDEALISTA_SEARCH_PAGES) throw new Error('Idealista pages are not set');

      this.urlsToRead = process.env.IDEALISTA_SEARCH_PAGES.split(/\/,/);

      return callback();
    } catch (error) {
      if (!(error instanceof Error)) return callback(new Error('Unknown error'));

      return callback(error);
    }
  }

  private async readIdealistaResultsPage(): Promise<boolean> {
    const url = this.urlsToRead.shift();
    if (!url || !this.page || this.page.isClosed()) return false;

    await this.sleep(1000, 2000);
    await this.page.goto(url);
    await this.page.waitForSelector('section.items-container article.item');
    let { nextPageLocator, hasNextPage } = await this.getNextPageHelpers(this.page);

    do {
      const locators = this.page.locator('section.items-container article.item');

      for (const propertyLocator of await locators.all()) {
        await propertyLocator.scrollIntoViewIfNeeded();
        const areaInM3 = await this.readAreaFromDetails(
          propertyLocator.locator('div.item-detail-char span.item-detail'),
        );
        const description = await readTextFromLocator(propertyLocator.locator('a.item-link'));
        const id = (await propertyLocator.getAttribute('data-adid')) ?? '';
        const link = (await propertyLocator.locator('a.item-link').getAttribute('href')) ?? '';
        const price =
          parsePortugueseNumber(
            await readTextFromLocator(propertyLocator.locator('span.item-price')),
          ) ?? 0;

        const hasEnergyCertification =
          (await propertyLocator.locator('.energy-certify').count()) > 0;
        const energyCertification = hasEnergyCertification
          ? (await readTextFromLocator(propertyLocator.locator('.energy-certify'))) ?? ''
          : '';

        const property: PropertyWithoutId = {
          areaInM3,
          description,
          energyCertification,
          externalId: id,
          link: new URL(link, IDEALISTA_URL.toString()).toString(),
          location: '',
          price,
          source: PropertySource.IDEALISTA,
        };

        if (this.readProperties.length > 10) throw new Error('fake error');

        this.readProperties.push(property);
      }

      if (hasNextPage) {
        await nextPageLocator.click();
        await this.page.waitForSelector('article');
        const helpers = await this.getNextPageHelpers(this.page);
        nextPageLocator = helpers.nextPageLocator;
        hasNextPage = helpers.hasNextPage;
      } else {
        break;
      }
    } while (true);
    return this.urlsToRead.length > 0;
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
      await this.readIdealistaResultsPage();
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
