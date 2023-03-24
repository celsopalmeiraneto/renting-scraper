import 'reflect-metadata';
import { scraperDataSource } from './data-sources';
import { PropertyEntity } from './entities/PropertyEntity';
import { ImovirtualScraper } from './scrapers/imovirtual/ImovirtualScraper';

const main = async () => {
  await scraperDataSource.initialize();

  const imovirtualScraper = new ImovirtualScraper();
  await imovirtualScraper.initialize();
  const properties = await imovirtualScraper.scrape();
  await imovirtualScraper.destroy();

  console.table(properties);

  const propertiesRepo = scraperDataSource.getRepository(PropertyEntity);
  const entities = propertiesRepo.create(properties);
  await propertiesRepo.upsert(entities, ['source', 'externalId']);
};

export const sum = (termA: number, termB: number) => termA + termB;

(async () => {
  await main();
})();
