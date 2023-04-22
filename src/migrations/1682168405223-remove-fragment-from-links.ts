import { MigrationInterface, QueryRunner } from 'typeorm';
import { PropertyEntity } from '../entities/PropertyEntity';
import { removeFragmentFromUrl } from '../utils';

export class RemoveFragmentsFromLinks1682168405223 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const propertyRepository = queryRunner.manager.getRepository(PropertyEntity);
    const propertiesToUpdate = await propertyRepository.find({
      withDeleted: false,
    });
    for (const property of propertiesToUpdate) {
      property.link = removeFragmentFromUrl(property.link);
      await propertyRepository.update(property.id, {
        link: property.link,
      });
    }
  }

  public async down(): Promise<void> {
    return Promise.resolve();
  }
}
