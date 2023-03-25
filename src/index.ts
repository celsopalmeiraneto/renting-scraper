import 'reflect-metadata';
import { scraperDataSource } from './data-sources';
import { ImovirtualScraper } from './scrapers/imovirtual/ImovirtualScraper';
import { sendEmail } from './services/mailer';
import { generateDiffFromScraped, persistDiffOnDb } from './services/property-diff';

const main = async () => {
  await scraperDataSource.initialize();

  const imovirtualScraper = new ImovirtualScraper();
  await imovirtualScraper.initialize();
  const scrapedProperties = await imovirtualScraper.scrape();
  await imovirtualScraper.destroy();

  const consolidatedItems = await generateDiffFromScraped(scrapedProperties);

  console.table(consolidatedItems);
  if (consolidatedItems.length === 0) return;

  await sendEmail(consolidatedItems);
  await persistDiffOnDb(consolidatedItems);
};

(async () => {
  await main();
})();
