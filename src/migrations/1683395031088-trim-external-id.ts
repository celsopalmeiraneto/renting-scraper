import { MigrationInterface, QueryRunner } from 'typeorm';
import { PropertyEntity } from '../entities/PropertyEntity';

export class TrimExternalId1683395031088 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const repository = queryRunner.manager.getRepository(PropertyEntity);
    const properties = await repository.find();
    for (const property of properties) {
      await repository.update(
        {
          id: property.id,
        },
        {
          externalId: property.externalId.trim(),
        },
      );
    }
  }

  public async down() {
    return Promise.resolve();
  }
}
