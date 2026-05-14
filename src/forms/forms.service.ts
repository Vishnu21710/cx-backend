import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from './forms.entity';
import { Stage1Dto } from './dto/stage1.dto';
import { Stage2Dto } from './dto/stage2.dto';
import { Stage3Dto } from './dto/stage3.dto';
import { Stage5Dto } from './dto/stage5.dto';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
  ) {}

  // ─── Create or resume form ────────────────────────────────────────────────
  async createForm(userId: string): Promise<Form> {
    const form = this.formRepo.create({ userId, currentStage: 1, status: 'in-progress' });
    return this.formRepo.save(form);
  }

  // ─── Get all pending forms for a user ─────────────────────────────────────
  async findPending(userId: string): Promise<Form[]> {
    return this.formRepo.find({
      where: { userId, status: 'in-progress' },
      order: { updatedAt: 'DESC' },
    });
  }

  // ─── Get a single form (with ownership check) ─────────────────────────────
  async getForm(formId: string, userId: string): Promise<Form> {
    const form = await this.formRepo.findOne({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Form #${formId} not found`);
    if (form.userId !== userId) throw new ForbiddenException('Access denied');
    return form;
  }

  // ─── Stage 1: Basic Information ───────────────────────────────────────────
  async saveStage1(formId: string, userId: string, dto: Stage1Dto): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 1);
    Object.assign(form, dto);
    form.currentStage = Math.max(form.currentStage, 2);
    return this.formRepo.save(form);
  }

  // ─── Stage 2: Address Details ─────────────────────────────────────────────
  async saveStage2(formId: string, userId: string, dto: Stage2Dto): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 2);
    Object.assign(form, dto);
    form.currentStage = Math.max(form.currentStage, 3);
    return this.formRepo.save(form);
  }

  // ─── Stage 3: Professional Details ───────────────────────────────────────
  async saveStage3(formId: string, userId: string, dto: Stage3Dto): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 3);
    Object.assign(form, dto);
    form.currentStage = Math.max(form.currentStage, 4);
    return this.formRepo.save(form);
  }

  // ─── Stage 4: Document Upload ─────────────────────────────────────────────
  async saveStage4(
    formId: string,
    userId: string,
    files: {
      photoId?: Express.Multer.File[];
      resume?: Express.Multer.File[];
      additionalDocuments?: Express.Multer.File[];
    },
  ): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 4);

    if (!files || !files.photoId?.[0]) throw new BadRequestException('Photo ID document is required');
    if (!files.resume?.[0]) throw new BadRequestException('Resume document is required');

    form.photoIdPath = (files.photoId[0] as any).location;
    form.resumePath = (files.resume[0] as any).location;
    form.additionalDocuments = (files.additionalDocuments ?? []).map((f) => (f as any).location);
    form.currentStage = Math.max(form.currentStage, 5);
    return this.formRepo.save(form);
  }

  // ─── Stage 5: Emergency Contact ───────────────────────────────────────────
  async saveStage5(formId: string, userId: string, dto: Stage5Dto): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 5);
    form.emergencyContactName = dto.emergencyContactName;
    form.emergencyContactPhone = dto.emergencyContactPhone;
    form.emergencyContactRelationship = dto.emergencyContactRelationship;
    // Stay at stage 5 until submitted
    return this.formRepo.save(form);
  }

  // ─── Submit Form (marks complete) ─────────────────────────────────────────
  async submitForm(formId: string, userId: string): Promise<Form> {
    const form = await this.getForm(formId, userId);

    if (form.status === 'completed') {
      throw new BadRequestException('Form has already been submitted');
    }

    // Validate all required stages are filled
    this.validateAllStages(form);

    form.status = 'completed';
    form.confirmed = true;
    form.submittedAt = new Date();
    form.currentStage = 5;
    return this.formRepo.save(form);
  }

  // ─── List forms with pagination ───────────────────────────────────────────
  async listForms(
    userId: string,
    page: number,
    limit: number,
    status?: string,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const query = this.formRepo
      .createQueryBuilder('form')
      .where('form.userId = :userId', { userId })
      .orderBy('form.updatedAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);

    if (status && ['in-progress', 'completed'].includes(status)) {
      query.andWhere('form.status = :status', { status });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      records: data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
        hasNextPage: safePage < Math.ceil(total / safeLimit),
        hasPreviousPage: safePage > 1,
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Ensures a user can only access stages they've unlocked.
   * Allows re-submitting a previous stage (users can update earlier stages).
   */
  private assertStageAccessible(form: Form, stage: number) {
    if (form.status === 'completed') {
      throw new BadRequestException('Cannot modify a submitted form');
    }
    // Allow accessing a stage if it's unlocked (currentStage >= stage - 1)
    if (stage > 1 && form.currentStage < stage - 1) {
      throw new BadRequestException(
        `Please complete stage ${stage - 1} before proceeding to stage ${stage}`,
      );
    }
  }

  /**
   * Validates that all required stages have data before final submission.
   */
  private validateAllStages(form: Form) {
    const missing: string[] = [];

    // Stage 1
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      missing.push('Stage 1 (Basic Information)');
    }

    // Stage 2
    if (!form.addressLine1 || !form.city || !form.state || !form.pincode) {
      missing.push('Stage 2 (Address Details)');
    }

    // Stage 3
    if (!form.company || !form.designation || !form.yearsOfExperience) {
      missing.push('Stage 3 (Professional Details)');
    }

    // Stage 4
    if (!form.photoIdPath || !form.resumePath) {
      missing.push('Stage 4 (Document Upload)');
    }

    // Stage 5
    if (
      !form.emergencyContactName ||
      !form.emergencyContactPhone ||
      !form.emergencyContactRelationship
    ) {
      missing.push('Stage 5 (Emergency Contact)');
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Please complete the following stages before submitting: ${missing.join(', ')}`,
      );
    }
  }
}