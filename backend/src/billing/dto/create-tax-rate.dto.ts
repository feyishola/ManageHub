export class CreateTaxRateDto {
  name: string;
  country: string;
  region?: string;
  rate: number;
  isCompound?: boolean;
}
