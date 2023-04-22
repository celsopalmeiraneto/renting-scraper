import { Locator, Page } from 'playwright';
import { ReadableOptions } from 'stream';
import { PropertySource, PropertyWithoutId } from '../../types';
import { parsePortugueseNumber, removeFragmentFromUrl, sleep } from '../../utils';
import { ScraperReadable } from '../ScraperReadable';
import { readTextFromLocator } from '../utils';

const COOKIE_BUTTON_SELECTOR = '#onetrust-accept-btn-handler';

export class ImovirtualReadable extends ScraperReadable {
  constructor(options?: Omit<ReadableOptions, 'objectMode' | 'read' | 'destroy' | 'construct'>) {
    super(options);
  }

  async _initialize(): Promise<void> {
    if (!process.env.IMOVIRTUAL_SEARCH_INITIAL_PAGE) throw new Error('Imovirtual page is not set');

    await this.page.goto('https://www.imovirtual.com');
    const cookieSelector = this.page.locator(COOKIE_BUTTON_SELECTOR);
    await cookieSelector.waitFor({ state: 'attached' });
    await cookieSelector.click();

    this.urlsToRead = [process.env.IMOVIRTUAL_SEARCH_INITIAL_PAGE];
  }

  private async getNextPageHelpers(page: Page) {
    const nextPageLocator = page.locator('li.pager-next a:not(.disabled)').first();
    const hasNextPage = !!(await nextPageLocator.count());

    return { nextPageLocator, hasNextPage };
  }

  private async readAreaFromArticle(articleLocator: Locator) {
    const liLocator = articleLocator.locator('li.offer-item-area');

    if (!liLocator) return null;

    const text = await readTextFromLocator(liLocator);
    const parsedNumber = parsePortugueseNumber(text);

    return Number.isNaN(parsedNumber) ? null : parsedNumber;
  }

  private async readLocation(articleLocator: Locator) {
    const liLocator = articleLocator.locator('p.text-nowrap');

    if (!liLocator) return null;

    const text = await readTextFromLocator(liLocator);
    return text.split(':')[1]?.trim();
  }

  async readResultsPage(): Promise<boolean> {
    const url = this.urlsToRead.shift();
    if (!url || !this.page || this.page.isClosed()) return false;
    if (!process.env.IMOVIRTUAL_SEARCH_INITIAL_PAGE) throw new Error('Imovirtual page is not set');

    await this.page.goto(url);
    await sleep(1000, 2000);
    await this.page.waitForSelector('article');
    let { nextPageLocator, hasNextPage } = await this.getNextPageHelpers(this.page);

    do {
      const locators = this.page.locator('article');

      for (const propertyLocator of await locators.all()) {
        await propertyLocator.scrollIntoViewIfNeeded();
        await sleep(400, 800);
        const areaInM3 = await this.readAreaFromArticle(propertyLocator);
        const description = await readTextFromLocator(
          propertyLocator.locator('span.offer-item-title'),
        );
        const id = (await propertyLocator.getAttribute('data-item-id')) ?? '';
        const linkWithFragment =
          (await propertyLocator.locator('a').first().getAttribute('href')) ?? null;
        const link = linkWithFragment ? removeFragmentFromUrl(linkWithFragment) : '';
        const price =
          parsePortugueseNumber(
            await readTextFromLocator(propertyLocator.locator('.offer-item-price')),
          ) ?? 0;
        const location = (await this.readLocation(propertyLocator)) ?? '';

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
          link,
          location,
          price,
          source: PropertySource.IMOVIRTUAL,
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
        return true;
      }
    } while (true);
  }
}
