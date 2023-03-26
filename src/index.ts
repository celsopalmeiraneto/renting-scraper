import 'reflect-metadata';
import { scraperDataSource } from './data-sources';
import { IdealistaScraper } from './scrapers/idealista/IdealistaScraper';
import { ImovirtualScraper } from './scrapers/imovirtual/ImovirtualScraper';
import { sendEmail } from './services/mailer';
import { generateDiffFromScraped, persistDiffOnDb } from './services/property-diff';

const main = async () => {
  await scraperDataSource.initialize();

  const idealistaScraper = new IdealistaScraper();
  await idealistaScraper.initialize();
  const idealistaProperties = await idealistaScraper.scrape();
  await idealistaScraper.destroy();

  const imovirtualScraper = new ImovirtualScraper();
  await imovirtualScraper.initialize();
  const imovirtualProperties = await imovirtualScraper.scrape();
  await imovirtualScraper.destroy();

  const diffSet = await generateDiffFromScraped([...idealistaProperties, ...imovirtualProperties]);

  if (diffSet.length === 0) return;

  await sendEmail(diffSet);
  await persistDiffOnDb(diffSet);
};

(async () => {
  await main();
})();
