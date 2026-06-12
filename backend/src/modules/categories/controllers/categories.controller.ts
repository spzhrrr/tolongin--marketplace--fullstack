import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './../services/categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ROLE } from '../../../common/constants/enums';

// ... rest of your code
@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id/services')
  @ApiOperation({ summary: 'Get services in category' })
  getServices(@Param('id') id: string) {
    return this.categoriesService.getServices(id);
  }

  @Public()
  @Get(':id/jobs')
  @ApiOperation({ summary: 'Get jobs in category' })
  getJobs(@Param('id') id: string) {
    return this.categoriesService.getJobs(id);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.ADMIN)
  @Post()
  @ApiOperation({ summary: '[Admin] Create new category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: '[Admin] Update category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: '[Admin] Delete category' })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
