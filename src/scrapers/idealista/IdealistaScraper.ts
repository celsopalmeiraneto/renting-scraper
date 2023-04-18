import { randomInt } from 'crypto';
import { Browser, firefox, Locator, Page } from 'playwright';
import { PropertySource, PropertyWithoutId } from '../../types';
import { parsePortugueseNumber } from '../../utils';
import { Scraper } from '../Scraper';
import { readTextFromLocator } from '../utils';

const COOKIE_BUTTON_SELECTOR = '#didomi-notice-agree-button';
const IDEALISTA_URL = new URL('https://www.idealista.pt');

export class IdealistaScraper extends Scraper<PropertyWithoutId> {
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
    await page.goto(IDEALISTA_URL.toString());
    const cookieSelector = page.locator(COOKIE_BUTTON_SELECTOR);
    await cookieSelector.waitFor({ state: 'attached' });
    await cookieSelector.click();
    this.page = page;
    this.browser = browser;
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

  private async scrapeSearchResults(page: Page): Promise<PropertyWithoutId[]> {
    if (!process.env.IDEALISTA_SEARCH_PAGES) throw new Error('Idealista pages are not set');

    const properties: PropertyWithoutId[] = [];
    const urls = process.env.IDEALISTA_SEARCH_PAGES.split(/\/,/);
    for (const url of urls) {
      await new Promise((resolve) => setTimeout(resolve, randomInt(4000, 8000)));
      await page.goto(url);
      await page.waitForSelector('section.items-container article.item');
      let { nextPageLocator, hasNextPage } = await this.getNextPageHelpers(page);

      do {
        const locators = page.locator('section.items-container article.item');

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

          properties.push(property);
        }

        if (hasNextPage) {
          await nextPageLocator.click();
          await page.waitForSelector('article');
          const helpers = await this.getNextPageHelpers(page);
          nextPageLocator = helpers.nextPageLocator;
          hasNextPage = helpers.hasNextPage;
        } else {
          break;
        }
      } while (true);
    }

    return properties;
  }

  async scrape(): Promise<PropertyWithoutId[]> {
    if (!this.page) throw new Error('Scraper not initialized');

    const properties = await this.scrapeSearchResults(this.page);
    for (const property of properties) {
      try {
        // firefox was just crashing for switching pages too quick
        await this.sleep();
        await this.page.goto(property.link);
        const locator = this.page.locator('span.main-info__title-minor');
        await locator.waitFor({ state: 'attached' });

        property.location = await readTextFromLocator(locator);
      } catch (err) {
        console.error(err);
      }
    }

    return properties;
  }
}
