import { Locator, Page } from 'playwright';
import { ReadableOptions } from 'stream';
import { PropertySource, PropertyWithoutId } from '../../types';
import { parsePortugueseNumber, sleep } from '../../utils';
import { ScraperReadable } from '../ScraperReadable';
import { readTextFromLocator } from '../utils';

const COOKIE_BUTTON_SELECTOR = '#didomi-notice-agree-button';
const IDEALISTA_URL = new URL('https://www.idealista.pt');

export class IdealistaReadable extends ScraperReadable {
  constructor(options?: Omit<ReadableOptions, 'objectMode' | 'read' | 'destroy' | 'construct'>) {
    super(options);
  }

  async _initialize(): Promise<void> {
    await this.page.goto(IDEALISTA_URL.toString());
    const cookieSelector = this.page.locator(COOKIE_BUTTON_SELECTOR);
    await cookieSelector.waitFor({ state: 'attached' });
    await cookieSelector.click();
    if (!process.env.IDEALISTA_SEARCH_PAGES) throw new Error('Idealista pages are not set');

    this.urlsToRead = process.env.IDEALISTA_SEARCH_PAGES.split(/\/,/);
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

  private readLocationFromDescription(title: string): string {
    const results = /(na|em|,)\s(?<location>.*\, .+)$/.exec(title);
    if (!results) return '';

    return (results.groups?.location ?? '').trim();
  }

  async readResultsPage() {
    const url = this.urlsToRead.shift();
    if (!url || !this.page || this.page.isClosed()) return false;

    await sleep(1000, 2000);
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
          location: this.readLocationFromDescription(description),
          price,
          source: PropertySource.IDEALISTA,
        };

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
}
