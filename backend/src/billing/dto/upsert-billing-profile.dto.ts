export class UpsertBillingProfileDto {
  companyName?: string;
  taxId?: string;
  billingEmail: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
