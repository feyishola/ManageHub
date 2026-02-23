import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Electronics' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Gadgets and electronic devices' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 'uuid-of-parent-category' })
    @IsUUID()
    @IsOptional()
    parentId?: string;

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
