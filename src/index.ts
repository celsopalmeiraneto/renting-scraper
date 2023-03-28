import 'reflect-metadata';
import { scraperDataSource } from './data-sources';
import { IdealistaScraper } from './scrapers/idealista/IdealistaScraper';
import { ImovirtualScraper } from './scrapers/imovirtual/ImovirtualScraper';
import { sendStatusEmail, sendUpdateEmail } from './services/mailer';
import { generateDiffFromScraped, persistDiffOnDb } from './services/property-diff';

const getPropertiesFromWebsite = async (
  Constructor: typeof ImovirtualScraper | typeof IdealistaScraper,
) => {
  const scraper = new Constructor();
  try {
    await scraper.initialize();
    const properties = await scraper.scrape();
    return properties;
  } catch (error: unknown) {
    const errorToSend = error instanceof Error ? error : new Error('Unknown error');
    await sendStatusEmail(errorToSend);
    return [];
  } finally {
    await scraper.destroy();
  }
};

const main = async () => {
  await scraperDataSource.initialize();

  const { ENABLE_IMOVIRTUAL, ENABLE_IDEALISTA } = process.env;

  const properties = [
    ...(ENABLE_IDEALISTA === 'true' ? await getPropertiesFromWebsite(IdealistaScraper) : []),
    ...(ENABLE_IMOVIRTUAL === 'true' ? await getPropertiesFromWebsite(ImovirtualScraper) : []),
  ];

  const diffSet = await generateDiffFromScraped(properties);

  if (diffSet.length === 0) return;

  await sendUpdateEmail(diffSet);
  await persistDiffOnDb(diffSet);
};

(async () => {
  await main().catch(async (error) => {
    await sendStatusEmail(error);
  });
})();
