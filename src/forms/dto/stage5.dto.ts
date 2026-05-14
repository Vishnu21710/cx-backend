import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class Stage5Dto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  emergencyContactName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number format' })
  emergencyContactPhone: string;

  @ApiProperty({
    example: 'spouse',
    enum: ['spouse', 'parent', 'sibling', 'friend', 'colleague', 'other'],
  })
  @IsIn(['spouse', 'parent', 'sibling', 'friend', 'colleague', 'other'])
  emergencyContactRelationship: string;
}
