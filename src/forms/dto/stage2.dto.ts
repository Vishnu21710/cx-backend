import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class Stage2Dto {
  @ApiProperty({ example: '123 Main Street, Apt 4B' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Near Central Park' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @Matches(/^\d{5,10}$/, { message: 'Pincode must be 5–10 digits' })
  pincode: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
