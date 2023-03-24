import { Browser, firefox, Locator, Page } from 'playwright';
import { Property } from '../../types';
import { parsePortugueseNumber } from '../../utils';
import { Scraper } from '../Scraper';
import { readTextFromLocator } from '../utils';

const IMO_COOKIE_BUTTON_SELECTOR = '#onetrust-accept-btn-handler';

export class ImovirtualScraper extends Scraper<Property> {
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

  async scrape(): Promise<Property[]> {
    if (!this.page) throw new Error('Scraper not initialized');
    if (!process.env.IMOVIRTUAL_SEARCH_INITIAL_PAGE) throw new Error('Imovirtual page is not set');

    await this.page.goto(process.env.IMOVIRTUAL_SEARCH_INITIAL_PAGE);
    await this.page.waitForSelector('article');
    const locators = await this.page.locator('article');

    const properties: Property[] = [];
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

      const property: Property = {
        areaInM3,
        description,
        energyCertification: '',
        id,
        link,
        location: '',
        price,
        source: 'imovirtual',
      };

      properties.push(property);
    }

    return properties;
  }
}
