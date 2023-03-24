export enum PropertySource {
  IMOVIRTUAL = 'imovirtual',
}
export interface Property {
  id: string;
  areaInM3: number | null;
  description: string;
  energyCertification: string | null;
  externalId: string;
  link: string;
  location: string;
  price: number;
  source: PropertySource;
}

export type PropertyWithoutId = Omit<Property, 'id'>;
