import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AnalyticsQueryDto {
    @IsOptional()
    @IsString()
    event?: string;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}
