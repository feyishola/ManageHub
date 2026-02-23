import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { RolesGuard } from '../auth/guard/roles.guard';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new category (Admin only)' })
    create(@Body() createCategoryDto: CreateCategoryDto) {
        return this.categoriesService.create(createCategoryDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all categories' })
    findAll() {
        return this.categoriesService.findAll();
    }

    @Get('tree')
    @ApiOperation({ summary: 'Get full category tree' })
    getTree() {
        return this.categoriesService.getTree();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a category by ID' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoriesService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a category (Admin only)' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Soft-delete a category and its children (Admin only)' })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoriesService.remove(id);
    }
}
