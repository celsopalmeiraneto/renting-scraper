import 'reflect-metadata';
import { scraperDataSource } from './data-sources';
import { IdealistaScraper } from './scrapers/idealista/IdealistaScraper';
import { ImovirtualScraper } from './scrapers/imovirtual/ImovirtualScraper';
import { sendEmail } from './services/mailer';
import { generateDiffFromScraped, persistDiffOnDb } from './services/property-diff';

const getPropertiesFromWebsite = async (
  Constructor: typeof ImovirtualScraper | typeof IdealistaScraper,
) => {
  const scraper = new Constructor();
  await scraper.initialize();
  const properties = await scraper.scrape();
  await scraper.destroy();
  return properties;
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

  await sendEmail(diffSet);
  await persistDiffOnDb(diffSet);
};

(async () => {
  await main();
})();
