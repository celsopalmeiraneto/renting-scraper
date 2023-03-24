import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Property, PropertySource } from '../types';

@Entity()
@Unique('UK_SOURCE_EXTERNAL_ID', ['source', 'externalId'])
export class PropertyEntity implements Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'real' })
  areaInM3: number | null;

  @Column()
  description: string;

  @Column({ nullable: true, type: 'text' })
  energyCertification: string | null;

  @Column()
  externalId: string;

  @Column()
  link: string;

  @Column()
  location: string;

  @Column()
  price: number;

  @Column({
    type: 'text',
  })
  source: PropertySource;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
