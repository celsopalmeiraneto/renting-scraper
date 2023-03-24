import { DataSource } from 'typeorm';
import { PropertyEntity } from './entities/PropertyEntity';

export const scraperDataSource = new DataSource({
  type: 'sqlite',
  database: './data/db.sql',
  entities: [PropertyEntity],
  synchronize: true,
  logging: 'all',
  logger: 'simple-console',
});
