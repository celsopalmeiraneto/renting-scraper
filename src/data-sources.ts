/* eslint-disable max-len */
import { DataSource } from 'typeorm';
import { PropertyEntity } from './entities/PropertyEntity';
import { RemoveFragmentsFromLinks1682168405223 } from './migrations/1682168405223-remove-fragment-from-links';
import { TrimExternalId1683395031088 } from './migrations/1683395031088-trim-external-id';

export const scraperDataSource = new DataSource({
  type: 'sqlite',
  database: './data/db.sql',
  entities: [PropertyEntity],
  synchronize: true,
  logging: 'all',
  logger: 'simple-console',
  migrations: [RemoveFragmentsFromLinks1682168405223, TrimExternalId1683395031088],
});
