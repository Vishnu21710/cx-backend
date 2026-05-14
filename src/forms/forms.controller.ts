import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { FormsService } from './forms.service';
import { Stage1Dto } from './dto/stage1.dto';
import { Stage2Dto } from './dto/stage2.dto';
import { Stage3Dto } from './dto/stage3.dto';
import { Stage4Dto } from './dto/stage4.dto';
import { Stage5Dto } from './dto/stage5.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { multerConfig } from './multer/multer.config';

@ApiTags('Forms')
@ApiBearerAuth('access-token')
@ApiCookieAuth('cookie-auth')
@UseGuards(JwtAuthGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // ─── Create a new form ────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new multi-stage form' })
  @ApiResponse({ status: 201, description: 'Form created, returns formId and currentStage' })
  createForm(@GetUser('sub') userId: string) {
    return this.formsService.createForm(userId);
  }

  // ─── Get pending forms ────────────────────────────────────────────────────
  @Get('pending')
  @ApiOperation({ summary: 'Get all in-progress forms for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of pending forms' })
  getPending(@GetUser('sub') userId: string) {
    return this.formsService.findPending(userId);
  }

  // ─── Get form (resume support) ────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get form by ID — use to resume from last saved stage' })
  @ApiResponse({ status: 200, description: 'Form data with currentStage for resume' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  getForm(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
  ) {
    return this.formsService.getForm(id, userId);
  }

  // ─── List forms with pagination ───────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all forms for the authenticated user (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['in-progress', 'completed'],
  })
  @ApiResponse({ status: 200, description: 'Paginated list of forms with meta' })
  listForms(
    @GetUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    return this.formsService.listForms(userId, +page, +limit, status);
  }

  // ─── Stage 1: Basic Information ───────────────────────────────────────────
  @Post(':id/stage/1')
  @ApiOperation({ summary: 'Stage 1 — Basic Information (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor(multerConfig))
  saveStage1(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
    @Body() dto: Stage1Dto,
  ) {
    return this.formsService.saveStage1(id, userId, dto);
  }

  // ─── Stage 2: Address Details ─────────────────────────────────────────────
  @Post(':id/stage/2')
  @ApiOperation({ summary: 'Stage 2 — Address Details (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor(multerConfig))
  saveStage2(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
    @Body() dto: Stage2Dto,
  ) {
    return this.formsService.saveStage2(id, userId, dto);
  }

  // ─── Stage 3: Professional Details ───────────────────────────────────────
  @Post(':id/stage/3')
  @ApiOperation({ summary: 'Stage 3 — Professional Details (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor(multerConfig))
  saveStage3(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
    @Body() dto: Stage3Dto,
  ) {
    return this.formsService.saveStage3(id, userId, dto);
  }

  // ─── Stage 4: Document Upload ─────────────────────────────────────────────
  @Post(':id/stage/4')
  @ApiOperation({
    summary: 'Stage 4 — Document Upload (multipart/form-data)',
    description: 'Upload photoId (required), resume (required), and up to 3 additionalDocuments',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photoId', maxCount: 1 },
        { name: 'resume', maxCount: 1 },
        { name: 'additionalDocuments', maxCount: 3 },
      ],
      multerConfig,
    ),
  )
  saveStage4(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
    @UploadedFiles()
    files: {
      photoId?: Express.Multer.File[];
      resume?: Express.Multer.File[];
      additionalDocuments?: Express.Multer.File[];
    },
  ) {
    return this.formsService.saveStage4(id, userId, files);
  }

  // ─── Stage 5: Emergency Contact ───────────────────────────────────────────
  @Post(':id/stage/5')
  @ApiOperation({ summary: 'Stage 5 — Emergency Contact (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor(multerConfig))
  saveStage5(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
    @Body() dto: Stage5Dto,
  ) {
    return this.formsService.saveStage5(id, userId, dto);
  }

  // ─── Submit Form ──────────────────────────────────────────────────────────
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit the form — validates all stages are complete and marks as submitted',
  })
  @ApiResponse({ status: 200, description: 'Form submitted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Missing stage data — lists which stages are incomplete',
  })
  submitForm(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
  ) {
    return this.formsService.submitForm(id, userId);
  }
}