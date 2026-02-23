import {
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ApplyTo } from '../enums/apply-to.enum';

export class CreateRateLimitDto {
  @ApiProperty({ description: 'Route pattern, e.g. /api/users or /api/users/:id' })
  @IsString()
  route: string;

  @ApiProperty({ description: 'HTTP method', example: 'GET' })
  @IsString()
  @Matches(/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|\*)$/, {
    message: 'method must be a valid HTTP method or *',
  })
  method: string;

  @ApiProperty({ description: 'Maximum requests allowed within window', minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  maxRequests: number;

  @ApiProperty({ description: 'Time window in seconds', minimum: 1, maximum: 86400 })
  @IsInt()
  @Min(1)
  @Max(86400)
  windowSeconds: number;

  @ApiPropertyOptional({ enum: ApplyTo, default: ApplyTo.ALL })
  @IsEnum(ApplyTo)
  @IsOptional()
  applyTo?: ApplyTo;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateRateLimitDto extends PartialType(CreateRateLimitDto) {}
