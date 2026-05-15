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

  async createForm(userId: string): Promise<Form> {
    const form = this.formRepo.create({
      userId,
      currentStage: 1,
      status: 'in-progress',
    });
    return this.formRepo.save(form);
  }

  async findPending(userId: string): Promise<Form[]> {
    return this.formRepo.find({
      where: { userId, status: 'in-progress' },
      order: { updatedAt: 'DESC' },
    });
  }

  async getForm(formId: string, userId: string): Promise<Form> {
    const form = await this.formRepo.findOne({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Form #${formId} not found`);
    if (form.userId !== userId) throw new ForbiddenException('Access denied');
    return form;
  }

  async saveStage1(
    formId: string,
    userId: string,
    dto: Stage1Dto,
  ): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 1);
    Object.assign(form, dto);
    form.currentStage = Math.max(form.currentStage, 2);
    return this.formRepo.save(form);
  }

  async saveStage2(
    formId: string,
    userId: string,
    dto: Stage2Dto,
  ): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 2);
    Object.assign(form, dto);
    form.currentStage = Math.max(form.currentStage, 3);
    return this.formRepo.save(form);
  }

  async saveStage3(
    formId: string,
    userId: string,
    dto: Stage3Dto,
  ): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 3);
    Object.assign(form, dto);
    form.currentStage = Math.max(form.currentStage, 4);
    return this.formRepo.save(form);
  }

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

    if (!files || !files.photoId?.[0])
      throw new BadRequestException('Photo ID document is required');
    if (!files.resume?.[0])
      throw new BadRequestException('Resume document is required');

    form.photoIdPath = (files.photoId[0] as any).location;
    form.resumePath = (files.resume[0] as any).location;
    form.additionalDocuments = (files.additionalDocuments ?? []).map(
      (f) => (f as any).location,
    );
    form.currentStage = Math.max(form.currentStage, 5);
    return this.formRepo.save(form);
  }

  async saveStage5(
    formId: string,
    userId: string,
    dto: Stage5Dto,
  ): Promise<Form> {
    const form = await this.getForm(formId, userId);
    this.assertStageAccessible(form, 5);
    form.emergencyContactName = dto.emergencyContactName;
    form.emergencyContactPhone = dto.emergencyContactPhone;
    form.emergencyContactRelationship = dto.emergencyContactRelationship;
    return this.formRepo.save(form);
  }

  async submitForm(formId: string, userId: string): Promise<Form> {
    const form = await this.getForm(formId, userId);

    if (form.status === 'completed') {
      throw new BadRequestException('Form has already been submitted');
    }

    this.validateAllStages(form);

    form.status = 'completed';
    form.confirmed = true;
    form.submittedAt = new Date();
    form.currentStage = 5;
    return this.formRepo.save(form);
  }

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

  private assertStageAccessible(form: Form, stage: number) {
    if (form.status === 'completed') {
      throw new BadRequestException('Cannot modify a submitted form');
    }
    if (stage > 1 && form.currentStage < stage - 1) {
      throw new BadRequestException(
        `Please complete stage ${stage - 1} before proceeding to stage ${stage}`,
      );
    }
  }

  private validateAllStages(form: Form) {
    const missing: string[] = [];

    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      missing.push('Stage 1 (Basic Information)');
    }

    if (!form.addressLine1 || !form.city || !form.state || !form.pincode) {
      missing.push('Stage 2 (Address Details)');
    }

    if (!form.company || !form.designation || !form.yearsOfExperience) {
      missing.push('Stage 3 (Professional Details)');
    }

    if (!form.photoIdPath || !form.resumePath) {
      missing.push('Stage 4 (Document Upload)');
    }

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
