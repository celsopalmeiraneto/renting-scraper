import 'reflect-metadata';
import { scraperDataSource } from './data-sources';
import { IdealistaReadable } from './scrapers/idealista/IdealistaReadable';
import { sendStatusEmail, sendUpdateEmail } from './services/mailer';
import { generateDiffFromScraped, persistDiffOnDb } from './services/property-diff';
import { ImovirtualReadable } from './scrapers/imovirtual/ImovirtualReadable';
import { PropertyWithoutId } from './types';
import { ScraperReadable } from './scrapers/ScraperReadable';
import { initializeLogger, log } from './logger';

interface ReadPropertiesReturn {
  properties: PropertyWithoutId[];
  success: boolean;
}

const readProperties = <T extends ScraperReadable>(scraper: T): Promise<ReadPropertiesReturn> =>
  new Promise((resolve) => {
    const response: ReadPropertiesReturn = {
      properties: [],
      success: true,
    };

    scraper.on('data', (property: PropertyWithoutId) => {
      response.properties.push(property);
    });

    scraper.on('error', (error) => {
      console.error(error);
      response.success = false;
      return resolve(response);
    });

    scraper.on('end', () => resolve(response));
  });

const main = async () => {
  await initializeLogger();
  log.info('Starting process');
  log.info('Initializing DataSource and Readables');
  await scraperDataSource.initialize();
  const idealistaScraper = new IdealistaReadable();
  const imovirtualScraper = new ImovirtualReadable();

  const [imovirtualResult, idealistaResult] = await Promise.all([
    readProperties(imovirtualScraper),
    readProperties(idealistaScraper),
  ]);

  const shouldFindRemoved = imovirtualResult.success && idealistaResult.success;

  log.info(
    `${imovirtualResult.properties.length + idealistaResult.properties.length} properties read.`,
  );

  if (!shouldFindRemoved) {
    log.warn('Skipping removing properties because of failure while reading!');
  }

  const diffSet = await generateDiffFromScraped(
    [...imovirtualResult.properties, ...idealistaResult.properties],
    shouldFindRemoved,
  );

  if (diffSet.length === 0) return;

  await sendUpdateEmail(diffSet);
  await persistDiffOnDb(diffSet);
  log.info('Process completed');
};

(async () => {
  await main().catch(async (error) => {
    log.error(error);
    await sendStatusEmail(error);
  });
})();
