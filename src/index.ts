import 'reflect-metadata';
import { In, Not } from 'typeorm';
import { scraperDataSource } from './data-sources';
import { PropertyEntity } from './entities/PropertyEntity';
import { ImovirtualScraper } from './scrapers/imovirtual/ImovirtualScraper';
import { sendEmail } from './services/mailer';
import { generateDiffFromScraped } from './services/property-diff';
import { Property } from './types';

type ChangesInProperty = {
  [Prop in keyof Property]?: {
    oldValue: Property[Prop];
    newValue: Property[Prop];
  };
};

type Diff =
  | {
      type: 'changed';
      entity: PropertyEntity;
      changes: ChangesInProperty;
    }
  | {
      type: 'new';
      entity: PropertyEntity;
    }
  | {
      type: 'deleted';
      entity: PropertyEntity;
    };

const main = async () => {
  await scraperDataSource.initialize();

  const imovirtualScraper = new ImovirtualScraper();
  await imovirtualScraper.initialize();
  const scrapedProperties = await imovirtualScraper.scrape();
  await imovirtualScraper.destroy();

  const consolidatedItems = await generateDiffFromScraped(scrapedProperties);

  console.table(consolidatedItems);

  await sendEmail(consolidatedItems);
};

export const sum = (termA: number, termB: number) => termA + termB;

(async () => {
  await main();
})();
