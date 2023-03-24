export interface Property {
  areaInM3: number | null;
  description: string;
  energyCertification: string | null;
  id: string;
  link: string;
  location: string;
  price: number;
  source: 'imovirtual';
}
