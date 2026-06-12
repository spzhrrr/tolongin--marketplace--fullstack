import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobsService } from '../services/jobs.service';
import { CreateJobDto, UpdateJobDto, JobQueryDto } from '../dto/job.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ROLE } from '../../../common/constants/enums';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List jobs with filter & pagination' })
  findAll(@Query() query: JobQueryDto) {
    return this.jobsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get job detail with applications' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findById(id);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Post()
  @ApiOperation({ summary: '[Buyer] Post a new job' })
  create(@CurrentUser('id') buyerId: string, @Body() dto: CreateJobDto) {
    return this.jobsService.create(buyerId, dto);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Put(':id')
  @ApiOperation({ summary: '[Buyer/Admin] Update job' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, userId, role, dto);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Delete(':id')
  @ApiOperation({ summary: '[Buyer/Admin] Delete job' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.jobsService.delete(id, userId, role);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Post(':id/close')
  @ApiOperation({ summary: '[Buyer] Close job' })
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobsService.close(id, userId);
  }
}
