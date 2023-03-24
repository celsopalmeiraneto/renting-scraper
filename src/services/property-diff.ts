import { In, Not } from 'typeorm';
import { scraperDataSource } from '../data-sources';
import { PropertyEntity } from '../entities/PropertyEntity';
import { Property, PropertyWithoutId } from '../types';

type ChangesInProperty = {
  [Prop in keyof Property]?: {
    oldValue: Property[Prop];
    newValue: Property[Prop];
  };
};

export type Diff =
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

const computeChangesFromDb = (
  scrapedProperty: PropertyWithoutId,
  propertyOnDb: PropertyEntity,
): ChangesInProperty => ({
  ...(propertyOnDb.areaInM3 !== scrapedProperty.areaInM3
    ? {
        areaInM3: {
          newValue: scrapedProperty.areaInM3,
          oldValue: propertyOnDb.areaInM3,
        },
      }
    : {}),
  ...(propertyOnDb.description !== scrapedProperty.description
    ? {
        description: {
          newValue: scrapedProperty.description,
          oldValue: propertyOnDb.description,
        },
      }
    : {}),
  ...(propertyOnDb.energyCertification !== scrapedProperty.energyCertification
    ? {
        energyCertification: {
          newValue: scrapedProperty.energyCertification,
          oldValue: propertyOnDb.energyCertification,
        },
      }
    : {}),
  ...(propertyOnDb.link !== scrapedProperty.link
    ? {
        link: {
          newValue: scrapedProperty.link,
          oldValue: propertyOnDb.link,
        },
      }
    : {}),
  ...(propertyOnDb.location !== scrapedProperty.location
    ? {
        location: {
          newValue: scrapedProperty.location,
          oldValue: propertyOnDb.location,
        },
      }
    : {}),
  ...(propertyOnDb.price !== scrapedProperty.price
    ? {
        price: {
          newValue: scrapedProperty.price,
          oldValue: propertyOnDb.price,
        },
      }
    : {}),
});

const handleNonExistingProperty = (scrapedProperty: PropertyWithoutId): Diff => {
  const repo = scraperDataSource.getRepository(PropertyEntity);

  return {
    type: 'new',
    entity: repo.create(scrapedProperty),
  };
};

const handleExistingProperty = (
  scrapedProperty: PropertyWithoutId,
  propertyOnDb: PropertyEntity,
): Diff => ({
  type: 'changed',
  entity: propertyOnDb,
  changes: computeChangesFromDb(scrapedProperty, propertyOnDb),
});

export const generateDiffFromScraped = async (
  scrapedProperties: PropertyWithoutId[],
): Promise<Diff[]> => {
  const repo = scraperDataSource.getRepository(PropertyEntity);
  const promises = scrapedProperties.map(async (scrapedProperty) => {
    const propertyOnDb = await repo.findOne({
      where: {
        source: scrapedProperty.source,
        externalId: scrapedProperty.externalId,
      },
    });

    if (!propertyOnDb) return handleNonExistingProperty(scrapedProperty);

    return handleExistingProperty(scrapedProperty, propertyOnDb);
  });

  const newAndChanges = await Promise.all(promises);
  const filteredNewAndChanges = newAndChanges.filter((diff) => {
    if (diff.type !== 'changed') return true;

    if (Object.keys(diff.changes).length > 0) return true;

    return false;
  });

  const removedItems = await repo.findBy({
    id: Not(In(newAndChanges.filter((v) => v.type === 'changed').map((v) => v.entity.id))),
  });
  const deleted = removedItems.map<Diff>((entity) => ({ type: 'deleted', entity }));

  return [...filteredNewAndChanges, ...deleted];
};
