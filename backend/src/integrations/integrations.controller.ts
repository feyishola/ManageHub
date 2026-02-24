import { Controller, Get, Delete, Param, Req } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  async list(@Req() req) {
    return this.service.listUserIntegrations(req.user.id);
  }

  @Get(':provider/connect')
  async connect(@Param('provider') provider: string) {
    // redirect to OAuth provider
  }

  @Get(':provider/callback')
  async callback(@Param('provider') provider: string, @Req() req) {
    // handle OAuth callback, save tokens
  }

  @Delete(':id')
  async disconnect(@Param('id') id: string) {
    return this.service.disconnectIntegration(id);
  }
}
