import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class TrackEventDto {
    @IsString()
    @IsNotEmpty()
    event: string;

    @IsOptional()
    @IsObject()
    properties?: Record<string, any>;

    @IsString()
    @IsNotEmpty()
    sessionId: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    ipAddress?: string;
}
