import { IntegrationProvider } from '../enums/integration-provider.enum';

export class ConnectIntegrationDto {
  provider: IntegrationProvider;
  scopes?: string[];
}
