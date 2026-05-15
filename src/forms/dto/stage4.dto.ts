import { ApiProperty } from '@nestjs/swagger';

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
