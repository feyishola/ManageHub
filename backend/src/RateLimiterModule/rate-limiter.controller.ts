import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RateLimiterService } from './rate-limiter.service';
import { CreateRateLimitDto, UpdateRateLimitDto } from './dto/create-rate-limit.dto';
import { RateLimit } from './entities/rate-limit.entity';

// Replace with your actual admin guard / roles decorator
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Rate Limits')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin')
@Controller('rate-limits')
export class RateLimiterController {
  constructor(private readonly rateLimiterService: RateLimiterService) {}

  @Get()
  @ApiOperation({ summary: 'List all configured rate limits (admin)' })
  @ApiResponse({ status: 200, type: [RateLimit] })
  findAll(): Promise<RateLimit[]> {
    return this.rateLimiterService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single rate limit by id' })
  @ApiResponse({ status: 200, type: RateLimit })
  @ApiResponse({ status: 404 })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RateLimit> {
    return this.rateLimiterService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom rate limit for a route' })
  @ApiResponse({ status: 201, type: RateLimit })
  @ApiResponse({ status: 409, description: 'Duplicate route/method/applyTo combination' })
  create(@Body() dto: CreateRateLimitDto): Promise<RateLimit> {
    return this.rateLimiterService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rate limit' })
  @ApiResponse({ status: 200, type: RateLimit })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRateLimitDto,
  ): Promise<RateLimit> {
    return this.rateLimiterService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rate limit (reverts route to global default)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rateLimiterService.remove(id);
  }
}
