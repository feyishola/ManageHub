import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) { }

    async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
        const slug = this.generateSlug(createCategoryDto.name);

        const existing = await this.categoryRepository.findOne({ where: { slug } });
        if (existing) {
            throw new ConflictException(`Category with slug "${slug}" already exists`);
        }

        if (createCategoryDto.parentId) {
            const parent = await this.categoryRepository.findOne({ where: { id: createCategoryDto.parentId } });
            if (!parent) {
                throw new NotFoundException(`Parent category not found`);
            }
        }

        const category = this.categoryRepository.create({
            ...createCategoryDto,
            slug,
        });

        return await this.categoryRepository.save(category);
    }

    async findAll() {
        return await this.categoryRepository.find({
            order: { name: 'ASC' },
            relations: ['parent'],
        });
    }

    async getTree() {
        const allCategories = await this.categoryRepository.find({
            order: { name: 'ASC' },
        });

        return this.buildTree(allCategories, null);
    }

    private buildTree(categories: Category[], parentId: string | null): any {
        return categories
            .filter(category => category.parentId === parentId)
            .map(category => ({
                ...category,
                children: this.buildTree(categories, category.id),
            }));
    }

    async findOne(id: string): Promise<Category> {
        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['children', 'parent'],
        });
        if (!category) {
            throw new NotFoundException(`Category with ID "${id}" not found`);
        }
        return category;
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        const category = await this.findOne(id);

        if (updateCategoryDto.parentId) {
            if (updateCategoryDto.parentId === id) {
                throw new BadRequestException('A category cannot be its own parent');
            }

            await this.checkForCircularReference(id, updateCategoryDto.parentId);

            const parent = await this.categoryRepository.findOne({ where: { id: updateCategoryDto.parentId } });
            if (!parent) {
                throw new NotFoundException(`Parent category not found`);
            }
        }

        const updateData = updateCategoryDto as any;
        if (updateData.name && updateData.name !== category.name) {
            category.slug = this.generateSlug(updateData.name);
        }

        Object.assign(category, updateCategoryDto);
        return await this.categoryRepository.save(category);
    }

    async remove(id: string): Promise<void> {
        const category = await this.findOne(id);

        // Soft delete children recursively
        await this.recursiveSoftDelete(category);
    }

    private async recursiveSoftDelete(category: Category): Promise<void> {
        const children = await this.categoryRepository.find({ where: { parentId: category.id } });
        for (const child of children) {
            await this.recursiveSoftDelete(child);
        }
        await this.categoryRepository.softRemove(category);
    }

    private async checkForCircularReference(currentId: string, targetParentId: string): Promise<void> {
        let parent = await this.categoryRepository.findOne({ where: { id: targetParentId } });

        while (parent) {
            if (parent.id === currentId) {
                throw new BadRequestException('Circular reference detected: category cannot be a descendant of itself');
            }
            if (!parent.parentId) break;
            parent = await this.categoryRepository.findOne({ where: { id: parent.parentId } });
        }
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }
}
