import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class Stage3Dto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  company: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  designation: string;

  @ApiProperty({ example: '5', description: 'Years of professional experience' })
  @IsNumberString()
  yearsOfExperience: string;

  @ApiPropertyOptional({
    example: 'TypeScript, NestJS, PostgreSQL, React',
    description: 'Comma-separated list of skills',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  skills?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsUrl({}, { message: 'LinkedIn URL must be a valid URL' })
  linkedInUrl?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.dev' })
  @IsOptional()
  @IsUrl({}, { message: 'Portfolio URL must be a valid URL' })
  portfolioUrl?: string;
}
