import { Browser, firefox, Locator, Page } from 'playwright';
import { PropertySource, PropertyWithoutId } from '../../types';
import { parsePortugueseNumber } from '../../utils';
import { Scraper } from '../Scraper';
import { readTextFromLocator } from '../utils';

const IMO_COOKIE_BUTTON_SELECTOR = '#onetrust-accept-btn-handler';

export class ImovirtualScraper extends Scraper<PropertyWithoutId> {
  async destroy(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
  page: Page | null = null;
  browser: Browser | null = null;

  async initialize(): Promise<void> {
    const browser = await firefox.launch({
      headless: false,
    });
    const page = await browser.newPage();
    await page.goto('https://www.imovirtual.com');
    await page.waitForSelector(IMO_COOKIE_BUTTON_SELECTOR);
    await page.click(IMO_COOKIE_BUTTON_SELECTOR);
    this.page = page;
    this.browser = browser;
  }

  private async readAreaFromArticle(articleLocator: Locator) {
    const liLocator = articleLocator.locator('li.offer-item-area');

    if (!liLocator) return null;

    const text = await readTextFromLocator(liLocator);
    const parsedNumber = parsePortugueseNumber(text);

    return Number.isNaN(parsedNumber) ? null : parsedNumber;
  }

  private async getNextPageHelpers(page: Page) {
    const nextPageLocator = page.locator('li.pager-next a:not(.disabled)').first();
    const hasNextPage = !!(await nextPageLocator.count());

    return { nextPageLocator, hasNextPage };
  }

  async scrape(): Promise<PropertyWithoutId[]> {
    if (!this.page) throw new Error('Scraper not initialized');
    if (!process.env.IMOVIRTUAL_SEARCH_INITIAL_PAGE) throw new Error('Imovirtual page is not set');

    await this.page.goto(process.env.IMOVIRTUAL_SEARCH_INITIAL_PAGE);

    await this.page.waitForSelector('article');
    let { nextPageLocator, hasNextPage } = await this.getNextPageHelpers(this.page);

    const properties: PropertyWithoutId[] = [];
    do {
      const locators = this.page.locator('article');

      for (const propertyLocator of await locators.all()) {
        await propertyLocator.scrollIntoViewIfNeeded();
        const areaInM3 = await this.readAreaFromArticle(propertyLocator);
        const description = await readTextFromLocator(
          propertyLocator.locator('span.offer-item-title'),
        );
        const id = (await propertyLocator.getAttribute('data-item-id')) ?? '';
        const link = (await propertyLocator.locator('a').first().getAttribute('href')) ?? '';
        const price =
          parsePortugueseNumber(
            await readTextFromLocator(propertyLocator.locator('.offer-item-price')),
          ) ?? 0;

        const property: PropertyWithoutId = {
          areaInM3,
          description,
          energyCertification: '',
          externalId: id,
          link,
          location: '',
          price,
          source: PropertySource.IMOVIRTUAL,
        };

        properties.push(property);
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
    return properties;
  }
}
