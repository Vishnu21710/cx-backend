import { ApiProperty } from '@nestjs/swagger';

/**
 * Stage 4 — Document Upload
 *
 * This DTO is used only for Swagger documentation.
 * Actual file parsing is handled by multer FileFieldsInterceptor.
 *
 * Expected fields:
 *  - photoId  (required): PDF/JPG/PNG, max 5MB
 *  - resume   (required): PDF/JPG/PNG, max 5MB
 *  - additionalDocuments (optional): up to 3 extra files, PDF/JPG/PNG, max 5MB each
 */
export class Stage4Dto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Government-issued photo ID (PDF, JPG, or PNG, max 5MB)',
  })
  photoId: Express.Multer.File;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Resume / CV (PDF, JPG, or PNG, max 5MB)',
  })
  resume: Express.Multer.File;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
    description: 'Up to 3 additional supporting documents',
  })
  additionalDocuments?: Express.Multer.File[];
}
